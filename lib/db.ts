import { DatabaseSync } from "node:sqlite"
import fs from "fs"
import path from "path"
import crypto from "crypto"
import type { Link, LinkInput } from "./types"

const DATA_DIR = process.env.STASH_DATA_DIR ?? path.join(process.cwd(), "data")
const DB_FILE = path.join(DATA_DIR, "stash.db")

// Incrementar ao mudar o schema. Enquanto o projeto não está em produção, versões antigas são recriadas do zero.
const SCHEMA_VERSION = 2

const globalForDb = globalThis as unknown as { __stashDb?: DatabaseSync }

export function getDb(): DatabaseSync {
  if (globalForDb.__stashDb) return globalForDb.__stashDb

  fs.mkdirSync(DATA_DIR, { recursive: true })
  const db = new DatabaseSync(DB_FILE)
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;")

  const { user_version: version } = db.prepare("PRAGMA user_version").get() as { user_version: number }
  if (version < SCHEMA_VERSION) {
    db.exec(`
      DROP TABLE IF EXISTS link_tags;
      DROP TABLE IF EXISTS links;
      DROP TABLE IF EXISTS sessions;
      DROP TABLE IF EXISTS users;
      DROP TABLE IF EXISTS meta;
    `)
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
      name          TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    TEXT NOT NULL
    );

    -- Sessões do app web e tokens da extensão. Guarda só o hash do token.
    CREATE TABLE IF NOT EXISTS sessions (
      id           TEXT PRIMARY KEY,
      token_hash   TEXT NOT NULL UNIQUE,
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind         TEXT NOT NULL CHECK (kind IN ('web', 'api')),
      label        TEXT,
      created_at   TEXT NOT NULL,
      last_used_at TEXT NOT NULL,
      expires_at   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS links (
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
    );

    CREATE TABLE IF NOT EXISTS link_tags (
      link_id TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
      tag     TEXT NOT NULL,
      PRIMARY KEY (link_id, tag)
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_links_user_created ON links(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_links_user_url ON links(user_id, url);
    CREATE INDEX IF NOT EXISTS idx_link_tags_tag ON link_tags(tag);

    PRAGMA user_version = ${SCHEMA_VERSION};
  `)

  globalForDb.__stashDb = db
  return db
}

export function transaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec("BEGIN")
  try {
    const result = fn()
    db.exec("COMMIT")
    return result
  } catch (error) {
    db.exec("ROLLBACK")
    throw error
  }
}

// ---------------------------------------------------------------------------
// Links (todas as operações são restritas ao usuário dono)
// ---------------------------------------------------------------------------

type LinkRow = {
  id: string
  url: string
  title: string
  description: string | null
  category: string
  favicon: string | null
  favorite: number
  visits: number
  created_at: string
  updated_at: string
  last_visited_at: string | null
  tags: string
}

const SELECT_LINKS = `
  SELECT l.*, (SELECT json_group_array(tag) FROM link_tags WHERE link_id = l.id) AS tags
  FROM links l
`

function rowToLink(row: LinkRow): Link {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    description: row.description ?? undefined,
    category: row.category,
    favicon: row.favicon ?? undefined,
    favorite: row.favorite === 1,
    visits: row.visits,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastVisitedAt: row.last_visited_at ?? undefined,
    tags: (JSON.parse(row.tags) as string[]).sort(),
  }
}

function insertLink(db: DatabaseSync, userId: string, link: Link) {
  db.prepare(
    `INSERT INTO links
      (id, user_id, url, title, description, category, favicon, favorite, visits, created_at, updated_at, last_visited_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
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
  )
  replaceTags(db, link.id, link.tags)
}

function replaceTags(db: DatabaseSync, linkId: string, tags: string[]) {
  db.prepare("DELETE FROM link_tags WHERE link_id = ?").run(linkId)
  const insert = db.prepare("INSERT OR IGNORE INTO link_tags (link_id, tag) VALUES (?, ?)")
  for (const tag of tags) insert.run(linkId, tag)
}

/** Ids vêm do cliente em restauração/importação: se já existirem (de qualquer usuário), gera um novo. */
function freeId(db: DatabaseSync, id: string): string {
  return db.prepare("SELECT 1 FROM links WHERE id = ?").get(id) ? crypto.randomUUID() : id
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
  const str = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined)
  const createdAt = str(item.createdAt) ?? now

  return {
    id: str(item.id) ?? crypto.randomUUID(),
    url: str(item.url) ?? "",
    title: str(item.title) ?? str(item.url) ?? "Sem título",
    description: str(item.description),
    category: str(item.category) ?? "Outros",
    tags: normalizeTags(item.tags),
    favicon: str(item.favicon),
    favorite: item.favorite === true,
    visits: typeof item.visits === "number" ? item.visits : 0,
    createdAt,
    updatedAt: str(item.updatedAt) ?? createdAt,
    lastVisitedAt: str(item.lastVisitedAt),
  }
}

export function listLinks(userId: string): Link[] {
  const rows = getDb()
    .prepare(`${SELECT_LINKS} WHERE l.user_id = ? ORDER BY l.created_at DESC`)
    .all(userId) as unknown as LinkRow[]
  return rows.map(rowToLink)
}

export function getLink(userId: string, id: string): Link | null {
  const row = getDb().prepare(`${SELECT_LINKS} WHERE l.id = ? AND l.user_id = ?`).get(id, userId) as unknown as
    | LinkRow
    | undefined
  return row ? rowToLink(row) : null
}

/** Considera "https://x.com/a" e "https://x.com/a/" o mesmo link. */
export function findByUrl(userId: string, url: string, ignoreId?: string): Link | null {
  const base = url.replace(/\/+$/, "")
  const row = getDb()
    .prepare(`${SELECT_LINKS} WHERE l.user_id = ? AND l.url IN (?, ?) AND l.id != ? LIMIT 1`)
    .get(userId, base, `${base}/`, ignoreId ?? "") as unknown as LinkRow | undefined
  return row ? rowToLink(row) : null
}

export function createLink(userId: string, input: LinkInput): Link {
  const db = getDb()
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
  transaction(db, () => insertLink(db, userId, link))
  return link
}

export function updateLink(userId: string, id: string, input: Partial<LinkInput>): Link | null {
  const db = getDb()
  const current = getLink(userId, id)
  if (!current) return null

  const next: Link = {
    ...current,
    ...input,
    tags: input.tags ? normalizeTags(input.tags) : current.tags,
    updatedAt: new Date().toISOString(),
  }
  transaction(db, () => {
    db.prepare(
      `UPDATE links SET url = ?, title = ?, description = ?, category = ?, favicon = ?, favorite = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`,
    ).run(
      next.url,
      next.title,
      next.description ?? null,
      next.category,
      next.favicon ?? null,
      next.favorite ? 1 : 0,
      next.updatedAt,
      id,
      userId,
    )
    replaceTags(db, id, next.tags)
  })
  return next
}

export function deleteLink(userId: string, id: string): Link | null {
  const current = getLink(userId, id)
  if (!current) return null
  getDb().prepare("DELETE FROM links WHERE id = ? AND user_id = ?").run(id, userId)
  return current
}

/** Reinsere um link excluído (usado no "desfazer"). */
export function restoreLink(userId: string, link: Link): Link {
  const db = getDb()
  const restored = normalizeImported(link as unknown as Record<string, unknown>)
  return transaction(db, () => {
    const existing = findByUrl(userId, restored.url)
    if (existing) return existing
    restored.id = freeId(db, restored.id)
    insertLink(db, userId, restored)
    return restored
  })
}

export function registerVisit(userId: string, id: string) {
  getDb()
    .prepare("UPDATE links SET visits = visits + 1, last_visited_at = ? WHERE id = ? AND user_id = ?")
    .run(new Date().toISOString(), id, userId)
}

export function importLinks(userId: string, items: Record<string, unknown>[]): { imported: number; skipped: number } {
  const db = getDb()
  let imported = 0
  let skipped = 0

  transaction(db, () => {
    for (const item of items) {
      const link = normalizeImported(item)
      if (!link.url || findByUrl(userId, link.url)) {
        skipped++
        continue
      }
      link.id = freeId(db, link.id)
      insertLink(db, userId, link)
      imported++
    }
  })

  return { imported, skipped }
}
