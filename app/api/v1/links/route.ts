import { json, preflight, unauthorized } from "@/lib/api"
import * as db from "@/lib/db"
import { getCategories } from "@/lib/link-utils"
import { fetchPageMetadata } from "@/lib/metadata"
import { linkSchema } from "@/lib/schemas"
import { getRequestUser } from "@/lib/session"

export const dynamic = "force-dynamic"

export const OPTIONS = preflight

/** Lista os links junto com categorias e tags (para os filtros e sugestões da extensão). */
export async function GET(request: Request) {
  const user = await getRequestUser(request)
  if (!user) return unauthorized()

  const links = db.listLinks(user.id)
  const tags = Array.from(new Set(links.flatMap((l) => l.tags))).sort()
  return json({ links, categories: getCategories(links), tags, user: { name: user.name, email: user.email } })
}

/**
 * Cria um link. Com `autoMeta: true`, título/descrição/favicon ausentes são buscados na página
 * (usado pelo "Salvar link" do menu de contexto, que só conhece a URL).
 */
export async function POST(request: Request) {
  const user = await getRequestUser(request)
  if (!user) return unauthorized()

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") return json({ error: "Corpo inválido" }, 400)

  if (body.autoMeta && typeof body.url === "string") {
    const meta = await fetchPageMetadata(body.url).catch(() => ({}) as Record<string, string | undefined>)
    body.title ||= meta.title || body.url
    body.description ||= meta.description
    body.favicon ||= meta.favicon
  }

  const parsed = linkSchema.safeParse(body)
  if (!parsed.success) return json({ error: parsed.error.errors[0]?.message ?? "Dados inválidos" }, 400)

  const existing = db.findByUrl(user.id, parsed.data.url)
  if (existing) return json({ error: `Já salvo como "${existing.title}"`, link: existing }, 409)

  const link = db.createLink(user.id, { ...parsed.data, description: parsed.data.description || undefined })
  return json({ link }, 201)
}

