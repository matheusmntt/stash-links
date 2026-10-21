import crypto from "crypto"
import type { Row } from "@libsql/client"
import { getDb } from "./db"
import type { SessionInfo, User } from "./types"

// Evita uma escrita no banco a cada requisição só para atualizar "último uso"
const TOUCH_INTERVAL_MS = 5 * 60 * 1000

const rowToUser = (row: Row): User => ({
  id: String(row.id),
  email: String(row.email),
  name: String(row.name),
  createdAt: String(row.created_at),
})

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex")

// ---------------------------------------------------------------------------
// Usuários
// ---------------------------------------------------------------------------

export async function countUsers(): Promise<number> {
  const db = await getDb()
  return Number((await db.execute("SELECT COUNT(*) AS total FROM users")).rows[0].total)
}

export async function findUserByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
  const db = await getDb()
  const row = (await db.execute({ sql: "SELECT * FROM users WHERE email = ?", args: [email.trim()] })).rows[0]
  return row ? { ...rowToUser(row), passwordHash: String(row.password_hash) } : null
}

export async function getPasswordHash(userId: string): Promise<string | null> {
  const db = await getDb()
  const row = (await db.execute({ sql: "SELECT password_hash FROM users WHERE id = ?", args: [userId] })).rows[0]
  return row ? String(row.password_hash) : null
}

export async function createUser(input: { name: string; email: string; passwordHash: string }): Promise<User> {
  const db = await getDb()
  const user: User = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    createdAt: new Date().toISOString(),
  }
  await db.execute({
    sql: "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
    args: [user.id, user.email, user.name, input.passwordHash, user.createdAt],
  })
  return user
}

export async function updateProfile(userId: string, input: { name: string; email: string }): Promise<User | null> {
  const db = await getDb()
  await db.execute({
    sql: "UPDATE users SET name = ?, email = ? WHERE id = ?",
    args: [input.name.trim(), input.email.trim().toLowerCase(), userId],
  })
  const row = (await db.execute({ sql: "SELECT * FROM users WHERE id = ?", args: [userId] })).rows[0]
  return row ? rowToUser(row) : null
}

export async function updatePasswordHash(userId: string, passwordHash: string) {
  const db = await getDb()
  await db.execute({ sql: "UPDATE users SET password_hash = ? WHERE id = ?", args: [passwordHash, userId] })
}

// ---------------------------------------------------------------------------
// Sessões (cookie do app web e tokens da extensão)
// ---------------------------------------------------------------------------

export async function createSession(
  userId: string,
  kind: "web" | "api",
  durationMs: number,
  label?: string,
): Promise<{ token: string; id: string; expiresAt: string }> {
  const db = await getDb()
  const token = crypto.randomBytes(32).toString("base64url")
  const id = crypto.randomUUID()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + durationMs).toISOString()

  await db.batch(
    [
      { sql: "DELETE FROM sessions WHERE expires_at < ?", args: [now.toISOString()] },
      {
        sql: `INSERT INTO sessions (id, token_hash, user_id, kind, label, created_at, last_used_at, expires_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [id, hashToken(token), userId, kind, label ?? null, now.toISOString(), now.toISOString(), expiresAt],
      },
    ],
    "write",
  )

  return { token, id, expiresAt }
}

export async function getSessionByToken(
  token: string,
  kind: "web" | "api",
): Promise<{ sessionId: string; expiresAt: string; user: User } | null> {
  const db = await getDb()
  const row = (
    await db.execute({
      sql: `SELECT s.id AS session_id, s.expires_at, s.last_used_at, u.*
            FROM sessions s JOIN users u ON u.id = s.user_id
            WHERE s.token_hash = ? AND s.kind = ?`,
      args: [hashToken(token), kind],
    })
  ).rows[0]

  if (!row) return null
  const sessionId = String(row.session_id)
  const now = Date.now()
  if (Date.parse(String(row.expires_at)) < now) {
    await db.execute({ sql: "DELETE FROM sessions WHERE id = ?", args: [sessionId] })
    return null
  }
  if (now - Date.parse(String(row.last_used_at)) > TOUCH_INTERVAL_MS) {
    await db.execute({ sql: "UPDATE sessions SET last_used_at = ? WHERE id = ?", args: [new Date(now).toISOString(), sessionId] })
  }
  return { sessionId, expiresAt: String(row.expires_at), user: rowToUser(row) }
}

export async function listSessions(userId: string, currentSessionId?: string): Promise<SessionInfo[]> {
  const db = await getDb()
  const result = await db.execute({
    sql: "SELECT * FROM sessions WHERE user_id = ? AND expires_at > ? ORDER BY last_used_at DESC",
    args: [userId, new Date().toISOString()],
  })
  return result.rows.map((row) => ({
    id: String(row.id),
    kind: String(row.kind) as "web" | "api",
    label: row.label === null ? undefined : String(row.label),
    createdAt: String(row.created_at),
    lastUsedAt: String(row.last_used_at),
    expiresAt: String(row.expires_at),
    current: String(row.id) === currentSessionId,
  }))
}

export async function deleteSession(userId: string, sessionId: string): Promise<boolean> {
  const db = await getDb()
  const result = await db.execute({ sql: "DELETE FROM sessions WHERE id = ? AND user_id = ?", args: [sessionId, userId] })
  return result.rowsAffected > 0
}

export async function deleteSessionByToken(token: string) {
  const db = await getDb()
  await db.execute({ sql: "DELETE FROM sessions WHERE token_hash = ?", args: [hashToken(token)] })
}

export async function deleteOtherSessions(userId: string, keepSessionId: string) {
  const db = await getDb()
  await db.execute({ sql: "DELETE FROM sessions WHERE user_id = ? AND id != ?", args: [userId, keepSessionId] })
}
