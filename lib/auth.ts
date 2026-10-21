"use server"

import { cookies } from "next/headers"
import { z } from "zod"
import {
  API_TOKEN_DURATION_MS,
  MIN_PASSWORD_LENGTH,
  SESSION_COOKIE,
  failureDelay,
  getSession,
  getSessionDurationMs,
  hashPassword,
  isExtensionRedirect,
  isSignupEnabled,
  verifyPassword,
} from "./session"
import * as users from "./users"
import type { ActionResult, SessionInfo, User } from "./types"

type AuthResult = { success: boolean; error?: string }

const emailSchema = z.string().trim().toLowerCase().email("E-mail inválido").max(200)
const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`)
  .max(200)
const nameSchema = z.string().trim().min(1, "Informe seu nome").max(80)

async function startSession(userId: string) {
  const duration = getSessionDurationMs()
  const { token } = await users.createSession(userId, "web", duration)
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(duration / 1000),
  })
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const user = await users.findUserByEmail(String(email ?? ""))
  if (!(await verifyPassword(String(password ?? ""), user?.passwordHash)) || !user) {
    await failureDelay()
    return { success: false, error: "E-mail ou senha incorretos" }
  }
  await startSession(user.id)
  return { success: true }
}

export async function signup(input: { name: string; email: string; password: string }): Promise<AuthResult> {
  if (!isSignupEnabled()) return { success: false, error: "O cadastro de novas contas está desativado" }

  const parsed = z.object({ name: nameSchema, email: emailSchema, password: passwordSchema }).safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message }

  if (await users.findUserByEmail(parsed.data.email)) {
    return { success: false, error: "Já existe uma conta com esse e-mail" }
  }

  const user = await users.createUser({ ...parsed.data, passwordHash: await hashPassword(parsed.data.password) })
  await startSession(user.id)
  return { success: true }
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (token) await users.deleteSessionByToken(token)
  cookieStore.delete(SESSION_COOKIE)
}

// ---------------------------------------------------------------------------
// Conta
// ---------------------------------------------------------------------------

async function withSession<T>(
  fn: (session: NonNullable<Awaited<ReturnType<typeof getSession>>>) => T | Promise<T>,
): Promise<ActionResult<T>> {
  const session = await getSession()
  if (!session) return { ok: false, error: "UNAUTHORIZED" }
  try {
    return { ok: true, data: await fn(session) }
  } catch (error) {
    if (error instanceof z.ZodError) return { ok: false, error: error.errors[0]?.message ?? "Dados inválidos" }
    return { ok: false, error: error instanceof Error ? error.message : "Erro inesperado" }
  }
}

export async function updateProfile(input: { name: string; email: string }): Promise<ActionResult<User>> {
  return withSession(async ({ user }) => {
    const data = z.object({ name: nameSchema, email: emailSchema }).parse(input)
    const owner = await users.findUserByEmail(data.email)
    if (owner && owner.id !== user.id) throw new Error("Já existe uma conta com esse e-mail")
    const updated = await users.updateProfile(user.id, data)
    if (!updated) throw new Error("Conta não encontrada")
    return updated
  })
}

/** Troca a senha e encerra todas as outras sessões e tokens da extensão. */
export async function changePassword(currentPassword: string, newPassword: string): Promise<ActionResult> {
  return withSession(async ({ user, sessionId }) => {
    if (!(await verifyPassword(currentPassword, await users.getPasswordHash(user.id)))) {
      await failureDelay()
      throw new Error("Senha atual incorreta")
    }
    await users.updatePasswordHash(user.id, await hashPassword(passwordSchema.parse(newPassword)))
    await users.deleteOtherSessions(user.id, sessionId)
  })
}

export async function getSessions(): Promise<ActionResult<SessionInfo[]>> {
  return withSession(({ user, sessionId }) => users.listSessions(user.id, sessionId))
}

export async function revokeSession(id: string): Promise<ActionResult> {
  return withSession(async ({ user, sessionId }) => {
    if (id === sessionId) throw new Error("Use \"Sair\" para encerrar a sessão atual")
    if (!(await users.deleteSession(user.id, id))) throw new Error("Sessão não encontrada")
  })
}

/**
 * Autoriza a extensão do navegador (tela /connect). Cria um token de API e devolve a URL
 * da página da extensão com o token no fragmento (#), que nunca é enviado a servidores.
 */
export async function authorizeExtension(input: {
  redirect: string
  state: string
  label?: string
}): Promise<ActionResult<{ redirectUrl: string }>> {
  return withSession(async ({ user }) => {
    if (!isExtensionRedirect(input.redirect)) throw new Error("Endereço de retorno inválido")
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(input.state)) throw new Error("Pedido de conexão inválido")

    const label = (input.label || "Extensão do navegador").slice(0, 80)
    const { token } = await users.createSession(user.id, "api", API_TOKEN_DURATION_MS, label)
    const params = new URLSearchParams({ token, state: input.state, email: user.email, name: user.name })
    return { redirectUrl: `${input.redirect}#${params}` }
  })
}
