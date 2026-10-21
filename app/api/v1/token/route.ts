import { json, preflight } from "@/lib/api"
import { API_TOKEN_DURATION_MS, failureDelay, verifyPassword } from "@/lib/session"
import { createSession, deleteSessionByToken, findUserByEmail } from "@/lib/users"

export const dynamic = "force-dynamic"

export const OPTIONS = preflight

/** Troca e-mail e senha por um token de API (usado pela extensão do navegador). */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const email = typeof body?.email === "string" ? body.email : ""
  const password = typeof body?.password === "string" ? body.password : ""
  const label = typeof body?.label === "string" ? body.label.slice(0, 80) : "Extensão do navegador"

  const user = await findUserByEmail(email)
  if (!(await verifyPassword(password, user?.passwordHash)) || !user) {
    await failureDelay()
    return json({ error: "E-mail ou senha incorretos" }, 401)
  }

  const { token, expiresAt } = await createSession(user.id, "api", API_TOKEN_DURATION_MS, label)
  return json({ token, expiresAt, user: { name: user.name, email: user.email } })
}

/** Revoga o token usado na requisição (botão "Desconectar" da extensão). */
export async function DELETE(request: Request) {
  const header = request.headers.get("authorization")
  if (header?.startsWith("Bearer ")) await deleteSessionByToken(header.slice(7).trim())
  return json({ ok: true })
}
