import bcrypt from "bcryptjs"
import { cookies } from "next/headers"
import { countUsers, getSessionByToken } from "./users"
import type { User } from "./types"

export const SESSION_COOKIE = "stash_session"

const DEFAULT_SESSION_MINUTES = 60 * 24 * 7 // 7 dias
export const API_TOKEN_DURATION_MS = 365 * 24 * 60 * 60 * 1000
export const MIN_PASSWORD_LENGTH = 8

export function getSessionDurationMs(): number {
  const minutes = Number(process.env.AUTH_SESSION_MINUTES)
  return (Number.isFinite(minutes) && minutes > 0 ? minutes : DEFAULT_SESSION_MINUTES) * 60 * 1000
}

/** O primeiro cadastro é sempre liberado (setup); depois, só com ALLOW_SIGNUP=true. */
export function isSignupAllowed(): boolean {
  return countUsers() === 0 || process.env.ALLOW_SIGNUP === "true"
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

// Usado quando o e-mail não existe, para o tempo de resposta não revelar quais contas existem
let dummyHash: string | undefined

export async function verifyPassword(password: string, hash: string | null | undefined): Promise<boolean> {
  dummyHash ??= bcrypt.hashSync("stash-dummy-password", 10)
  const valid = await bcrypt.compare(password, hash ?? dummyHash)
  return Boolean(hash) && valid
}

// A extensão só pode receber o token na própria página de retorno (nunca num site qualquer)
const EXTENSION_REDIRECT = /^(chrome-extension|moz-extension):\/\/[a-zA-Z0-9-]+\/connected\.html$/

export function isExtensionRedirect(url: string): boolean {
  return EXTENSION_REDIRECT.test(url)
}

/** Atraso simples após falhas de login para desencorajar força bruta. */
export const failureDelay = () => new Promise((resolve) => setTimeout(resolve, 600))

export async function getSession(): Promise<{ sessionId: string; expiresAt: string; user: User } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  return token ? getSessionByToken(token, "web") : null
}

export async function getCurrentUser(): Promise<User | null> {
  return (await getSession())?.user ?? null
}

/** Aceita o cookie de sessão (app web) ou um token Bearer (extensão). */
export async function getRequestUser(request: Request): Promise<User | null> {
  const header = request.headers.get("authorization")
  if (header?.startsWith("Bearer ")) return getSessionByToken(header.slice(7).trim(), "api")?.user ?? null
  return getCurrentUser()
}

export class UnauthorizedError extends Error {
  constructor() {
    super("UNAUTHORIZED")
  }
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser()
  if (!user) throw new UnauthorizedError()
  return user
}
