"use server"

import { cookies } from "next/headers"

const SESSION_DURATION = 5 * 60 * 1000 // 5 minutos em milissegundos

export async function verifyPassword(password: string): Promise<{ success: boolean; error?: string }> {
  let storedPassword = process.env.AUTH_PASSWORD_HASH

  if (!storedPassword) {
    return { success: false, error: "Senha não configurada no servidor" }
  }

  const isValid = password === storedPassword

  if (!isValid) {
    return { success: false, error: "Senha incorreta" }
  }

  const expiresAt = Date.now() + SESSION_DURATION
  const cookieStore = await cookies()

  cookieStore.set("auth_session", expiresAt.toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: SESSION_DURATION / 1000, // em segundos
  })

  return { success: true }
}

export async function checkAuth(): Promise<{ authenticated: boolean; expiresAt?: number }> {
  const cookieStore = await cookies()
  const session = cookieStore.get("auth_session")

  if (!session) {
    return { authenticated: false }
  }

  const expiresAt = Number.parseInt(session.value, 10)

  if (Date.now() > expiresAt) {
    cookieStore.delete("auth_session")
    return { authenticated: false }
  }

  return { authenticated: true, expiresAt }
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete("auth_session")
}
