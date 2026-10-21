import crypto from "crypto"
import { getDb } from "./db"
import type { SessionInfo, User } from "./types"

type UserRow = { id: string; email: string; name: string; password_hash: string; created_at: string }

type SessionRow = {
  id: string
  user_id: string
  kind: "web" | "api"
  label: string | null
  created_at: string
  last_used_at: string
  expires_at: string
}

// Evita uma escrita no banco a cada requisição só para atualizar "último uso"
const TOUCH_INTERVAL_MS = 5 * 60 * 1000

const rowToUser = (row: UserRow): User => ({ id: row.id, email: row.email, name: row.name, createdAt: row.created_at })

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex")

// ---------------------------------------------------------------------------
// Usuários
// ---------------------------------------------------------------------------

export function countUsers(): number {
  return (getDb().prepare("SELECT COUNT(*) AS total FROM users").get() as { total: number }).total
}

export function findUserByEmail(email: string): (User & { passwordHash: string }) | null {
  const row = getDb().prepare("SELECT * FROM users WHERE email = ?").get(email.trim()) as UserRow | undefined
  return row ? { ...rowToUser(row), passwordHash: row.password_hash } : null
}

export function getPasswordHash(userId: string): string | null {
  const row = getDb().prepare("SELECT password_hash FROM users WHERE id = ?").get(userId) as
    | { password_hash: string }
    | undefined
  return row?.password_hash ?? null
}

export function createUser(input: { name: string; email: string; passwordHash: string }): User {
  const user: User = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    createdAt: new Date().toISOString(),
  }
  getDb()
    .prepare("INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(user.id, user.email, user.name, input.passwordHash, user.createdAt)
  return user
}

export function updateProfile(userId: string, input: { name: string; email: string }): User | null {
  getDb()
    .prepare("UPDATE users SET name = ?, email = ? WHERE id = ?")
    .run(input.name.trim(), input.email.trim().toLowerCase(), userId)
  const row = getDb().prepare("SELECT * FROM users WHERE id = ?").get(userId) as UserRow | undefined
  return row ? rowToUser(row) : null
}

export function updatePasswordHash(userId: string, passwordHash: string) {
  getDb().prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, userId)
}

// ---------------------------------------------------------------------------
// Sessões (cookie do app web e tokens da extensão)
// ---------------------------------------------------------------------------

export function createSession(
  userId: string,
  kind: "web" | "api",
  durationMs: number,
  label?: string,
): { token: string; id: string; expiresAt: string } {
  const token = crypto.randomBytes(32).toString("base64url")
  const id = crypto.randomUUID()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + durationMs).toISOString()

  const db = getDb()
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(now.toISOString())
  db.prepare(
    `INSERT INTO sessions (id, token_hash, user_id, kind, label, created_at, last_used_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, hashToken(token), userId, kind, label ?? null, now.toISOString(), now.toISOString(), expiresAt)

  return { token, id, expiresAt }
}

export function getSessionByToken(
  token: string,
  kind: "web" | "api",
): { sessionId: string; expiresAt: string; user: User } | null {
  const db = getDb()
  const row = db
    .prepare(
      `SELECT s.id AS session_id, s.expires_at, s.last_used_at, u.*
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.kind = ?`,
    )
    .get(hashToken(token), kind) as (UserRow & { session_id: string; expires_at: string; last_used_at: string }) | undefined

  if (!row) return null
  const now = Date.now()
  if (Date.parse(row.expires_at) < now) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(row.session_id)
    return null
  }
  if (now - Date.parse(row.last_used_at) > TOUCH_INTERVAL_MS) {
    db.prepare("UPDATE sessions SET last_used_at = ? WHERE id = ?").run(new Date(now).toISOString(), row.session_id)
  }
  return { sessionId: row.session_id, expiresAt: row.expires_at, user: rowToUser(row) }
}

export function listSessions(userId: string, currentSessionId?: string): SessionInfo[] {
  const rows = getDb()
    .prepare("SELECT * FROM sessions WHERE user_id = ? AND expires_at > ? ORDER BY last_used_at DESC")
    .all(userId, new Date().toISOString()) as unknown as SessionRow[]
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    label: row.label ?? undefined,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    expiresAt: row.expires_at,
    current: row.id === currentSessionId,
  }))
}

export function deleteSession(userId: string, sessionId: string): boolean {
  return getDb().prepare("DELETE FROM sessions WHERE id = ? AND user_id = ?").run(sessionId, userId).changes > 0
}

export function deleteSessionByToken(token: string) {
  getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token))
}

export function deleteOtherSessions(userId: string, keepSessionId: string) {
  getDb().prepare("DELETE FROM sessions WHERE user_id = ? AND id != ?").run(userId, keepSessionId)
}
