import { createClient, type Client, type InStatement, type Row } from "@libsql/client"
import crypto from "crypto"
import fs from "fs"
import path from "path"
import type { Link, LinkInput } from "./types"

// ---------------------------------------------------------------------------
// Conexão
// ---------------------------------------------------------------------------

/**
 * Em produção usa o Turso (TURSO_DATABASE_URL + TURSO_AUTH_TOKEN).
 * Sem essas variáveis, em desenvolvimento, usa um arquivo local em data/stash.db.
 */
function createDbClient(): Client {
  const url = process.env.TURSO_DATABASE_URL
  if (url) return createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN })

  // Na Vercel o disco é temporário: sem Turso os dados seriam perdidos a cada deploy
  if (process.env.VERCEL) {
    throw new Error("TURSO_DATABASE_URL não configurada. Defina as variáveis do Turso no projeto da Vercel.")
  }

  const dataDir = process.env.STASH_DATA_DIR ?? path.join(process.cwd(), "data")
  fs.mkdirSync(dataDir, { recursive: true })
  return createClient({ url: `file:${path.join(dataDir, "stash.db")}` })
}

const globalForDb = globalThis as unknown as { __stashDb?: Client; __stashDbReady?: Promise<void> }

/** Cliente pronto para uso, com as migrações aplicadas (uma vez por processo). */
export async function getDb(): Promise<Client> {
  globalForDb.__stashDb ??= createDbClient()
  globalForDb.__stashDbReady ??= migrate(globalForDb.__stashDb).catch((error) => {
    globalForDb.__stashDbReady = undefined
    throw error
  })
  await globalForDb.__stashDbReady
  return globalForDb.__stashDb
}

// ---------------------------------------------------------------------------
// Migrações: cada uma roda uma única vez, em ordem. Nunca altere uma já publicada;
// para mudar o schema, adicione uma nova no fim da lista.
// ---------------------------------------------------------------------------

const MIGRATIONS: { name: string; sql: string[] }[] = [
  {
    name: "001_initial_schema",
    sql: [
      `CREATE TABLE IF NOT EXISTS users (
        id            TEXT PRIMARY KEY,
        email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
        name          TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at    TEXT NOT NULL
      )`,
      // Sessões do app web e tokens da extensão. Guarda só o hash do token.
      `CREATE TABLE IF NOT EXISTS sessions (
        id           TEXT PRIMARY KEY,
        token_hash   TEXT NOT NULL UNIQUE,
        user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        kind         TEXT NOT NULL CHECK (kind IN ('web', 'api')),
        label        TEXT,
        created_at   TEXT NOT NULL,
        last_used_at TEXT NOT NULL,
        expires_at   TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS links (
        id              TEXT PRIMARY KEY,
        user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        url             TEXT NOT NULL,
        title           TEXT NOT NULL,
        description     TEXT,
        category        TEXT NOT NULL,
        favicon         TEXT,
        favorite        INTEGER NOT NULL DEFAULT 0,
        visits          INTEGER NOT NULL DEFAULT 0,
        created_at      TEXT NOT NULL,
        updated_at      TEXT NOT NULL,
        last_visited_at TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS link_tags (
        link_id TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
        tag     TEXT NOT NULL,
        PRIMARY KEY (link_id, tag)
      )`,
      "CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_links_user_created ON links(user_id, created_at)",
      "CREATE INDEX IF NOT EXISTS idx_links_user_url ON links(user_id, url)",
      "CREATE INDEX IF NOT EXISTS idx_link_tags_tag ON link_tags(tag)",
    ],
  },
]

async function migrate(client: Client) {
  await client.execute("PRAGMA foreign_keys = ON")
  await client.execute(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)",
  )
  const applied = new Set((await client.execute("SELECT name FROM schema_migrations")).rows.map((r) => String(r.name)))

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.name)) continue
    await client.batch(
      [
        ...migration.sql,
        {
          sql: "INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)",
          args: [migration.name, new Date().toISOString()],
        },
      ],
      "write",
    )
  }
}

// ---------------------------------------------------------------------------
// Links (todas as operações são restritas ao usuário dono)
// ---------------------------------------------------------------------------

const SELECT_LINKS = `
  SELECT l.*, (SELECT json_group_array(tag) FROM link_tags WHERE link_id = l.id) AS tags
  FROM links l
`

const str = (value: unknown) => (value === null || value === undefined ? undefined : String(value))

function rowToLink(row: Row): Link {
  return {
    id: String(row.id),
    url: String(row.url),
    title: String(row.title),
    description: str(row.description),
    category: String(row.category),
    favicon: str(row.favicon),
    favorite: Number(row.favorite) === 1,
    visits: Number(row.visits),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    lastVisitedAt: str(row.last_visited_at),
    tags: (JSON.parse(String(row.tags)) as string[]).sort(),
  }
}

/** Comandos para gravar um link novo e suas tags (para usar em batch). */
function insertLinkStatements(userId: string, link: Link): InStatement[] {
  return [
    {
      sql: `INSERT INTO links
        (id, user_id, url, title, description, category, favicon, favorite, visits, created_at, updated_at, last_visited_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        link.id,
        userId,
        link.url,
        link.title,
        link.description ?? null,
        link.category,
        link.favicon ?? null,
        link.favorite ? 1 : 0,
        link.visits,
        link.createdAt,
        link.updatedAt,
        link.lastVisitedAt ?? null,
      ],
    },
    ...tagStatements(link.id, link.tags),
  ]
}

function tagStatements(linkId: string, tags: string[]): InStatement[] {
  return tags.map((tag) => ({ sql: "INSERT OR IGNORE INTO link_tags (link_id, tag) VALUES (?, ?)", args: [linkId, tag] }))
}

/** Ids vêm do cliente em restauração/importação: se já existirem (de qualquer usuário), gera um novo. */
async function freeId(db: Client, id: string): Promise<string> {
  const taken = await db.execute({ sql: "SELECT 1 FROM links WHERE id = ?", args: [id] })
  return taken.rows.length ? crypto.randomUUID() : id
}

export function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return []
  const clean = tags
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, "-"))
    .filter(Boolean)
  return Array.from(new Set(clean))
}

/** Normaliza um link vindo de importação/restauração, preenchendo campos ausentes. */
export function normalizeImported(item: Record<string, unknown>): Link {
  const now = new Date().toISOString()
  const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined)
  const createdAt = text(item.createdAt) ?? now

  return {
    id: text(item.id) ?? crypto.randomUUID(),
    url: text(item.url) ?? "",
    title: text(item.title) ?? text(item.url) ?? "Sem título",
    description: text(item.description),
    category: text(item.category) ?? "Outros",
    tags: normalizeTags(item.tags),
    favicon: text(item.favicon),
    favorite: item.favorite === true,
    visits: typeof item.visits === "number" ? item.visits : 0,
    createdAt,
    updatedAt: text(item.updatedAt) ?? createdAt,
    lastVisitedAt: text(item.lastVisitedAt),
  }
}

export async function listLinks(userId: string): Promise<Link[]> {
  const db = await getDb()
  const result = await db.execute({
    sql: `${SELECT_LINKS} WHERE l.user_id = ? ORDER BY l.created_at DESC`,
    args: [userId],
  })
  return result.rows.map(rowToLink)
}

export async function getLink(userId: string, id: string): Promise<Link | null> {
  const db = await getDb()
  const result = await db.execute({ sql: `${SELECT_LINKS} WHERE l.id = ? AND l.user_id = ?`, args: [id, userId] })
  return result.rows[0] ? rowToLink(result.rows[0]) : null
}

/** Considera "https://x.com/a" e "https://x.com/a/" o mesmo link. */
export async function findByUrl(userId: string, url: string, ignoreId?: string): Promise<Link | null> {
  const db = await getDb()
  const base = url.replace(/\/+$/, "")
  const result = await db.execute({
    sql: `${SELECT_LINKS} WHERE l.user_id = ? AND l.url IN (?, ?) AND l.id != ? LIMIT 1`,
    args: [userId, base, `${base}/`, ignoreId ?? ""],
  })
  return result.rows[0] ? rowToLink(result.rows[0]) : null
}

export async function createLink(userId: string, input: LinkInput): Promise<Link> {
  const db = await getDb()
  const now = new Date().toISOString()
  const link: Link = {
    ...input,
    tags: normalizeTags(input.tags),
    id: crypto.randomUUID(),
    favorite: input.favorite ?? false,
    visits: 0,
    createdAt: now,
    updatedAt: now,
  }
  await db.batch(insertLinkStatements(userId, link), "write")
  return link
}

export async function updateLink(userId: string, id: string, input: Partial<LinkInput>): Promise<Link | null> {
  const db = await getDb()
  const current = await getLink(userId, id)
  if (!current) return null

  const next: Link = {
    ...current,
    ...input,
    tags: input.tags ? normalizeTags(input.tags) : current.tags,
    updatedAt: new Date().toISOString(),
  }
  await db.batch(
    [
      {
        sql: `UPDATE links SET url = ?, title = ?, description = ?, category = ?, favicon = ?, favorite = ?, updated_at = ?
              WHERE id = ? AND user_id = ?`,
        args: [
          next.url,
          next.title,
          next.description ?? null,
          next.category,
          next.favicon ?? null,
          next.favorite ? 1 : 0,
          next.updatedAt,
          id,
          userId,
        ],
      },
      { sql: "DELETE FROM link_tags WHERE link_id = ?", args: [id] },
      ...tagStatements(id, next.tags),
    ],
    "write",
  )
  return next
}

export async function deleteLink(userId: string, id: string): Promise<Link | null> {
  const db = await getDb()
  const current = await getLink(userId, id)
  if (!current) return null
  // Remove as tags explicitamente: não depende do PRAGMA foreign_keys da conexão
  await db.batch(
    [
      { sql: "DELETE FROM link_tags WHERE link_id = ?", args: [id] },
      { sql: "DELETE FROM links WHERE id = ? AND user_id = ?", args: [id, userId] },
    ],
    "write",
  )
  return current
}

/** Reinsere um link excluído (usado no "desfazer"). */
export async function restoreLink(userId: string, link: Link): Promise<Link> {
  const db = await getDb()
  const restored = normalizeImported(link as unknown as Record<string, unknown>)
  const existing = await findByUrl(userId, restored.url)
  if (existing) return existing
  restored.id = await freeId(db, restored.id)
  await db.batch(insertLinkStatements(userId, restored), "write")
  return restored
}

export async function registerVisit(userId: string, id: string) {
  const db = await getDb()
  await db.execute({
    sql: "UPDATE links SET visits = visits + 1, last_visited_at = ? WHERE id = ? AND user_id = ?",
    args: [new Date().toISOString(), id, userId],
  })
}

export async function importLinks(
  userId: string,
  items: Record<string, unknown>[],
): Promise<{ imported: number; skipped: number }> {
  const db = await getDb()
  const existingUrls = new Set((await listLinks(userId)).map((l) => l.url.replace(/\/+$/, "")))
  const usedIds = new Set<string>()
  const statements: InStatement[] = []
  let imported = 0
  let skipped = 0

  for (const item of items) {
    const link = normalizeImported(item)
    const key = link.url.replace(/\/+$/, "")
    if (!link.url || existingUrls.has(key)) {
      skipped++
      continue
    }
    existingUrls.add(key)
    link.id = usedIds.has(link.id) ? crypto.randomUUID() : await freeId(db, link.id)
    usedIds.add(link.id)
    statements.push(...insertLinkStatements(userId, link))
    imported++
  }

  if (statements.length) await db.batch(statements, "write")
  return { imported, skipped }
}
