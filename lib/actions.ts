"use server"

import { z } from "zod"
import * as db from "./db"
import { fetchPageMetadata } from "./metadata"
import { linkSchema } from "./schemas"
import { UnauthorizedError, requireUser } from "./session"
import type { ActionResult, Link, LinkMetadata, User } from "./types"

async function run<T>(fn: (user: User) => T | Promise<T>): Promise<ActionResult<T>> {
  try {
    const user = await requireUser()
    return { ok: true, data: await fn(user) }
  } catch (error) {
    if (error instanceof UnauthorizedError) return { ok: false, error: "UNAUTHORIZED" }
    if (error instanceof z.ZodError) return { ok: false, error: error.errors[0]?.message ?? "Dados inválidos" }
    if (error instanceof Error && error.message) return { ok: false, error: error.message }
    console.error(error)
    return { ok: false, error: "Erro inesperado" }
  }
}

export async function getLinks(): Promise<ActionResult<Link[]>> {
  return run((user) => db.listLinks(user.id))
}

export async function addLink(input: unknown): Promise<ActionResult<Link>> {
  return run(async (user) => {
    const data = linkSchema.parse(input)
    const existing = await db.findByUrl(user.id, data.url)
    if (existing) throw new Error(`Esse link já está salvo como "${existing.title}"`)
    return db.createLink(user.id, { ...data, description: data.description || undefined })
  })
}

export async function updateLink(id: string, input: unknown): Promise<ActionResult<Link>> {
  return run(async (user) => {
    const data = linkSchema.parse(input)
    const existing = await db.findByUrl(user.id, data.url, id)
    if (existing) throw new Error(`Esse link já está salvo como "${existing.title}"`)
    const updated = await db.updateLink(user.id, id, { ...data, description: data.description || undefined })
    if (!updated) throw new Error("Link não encontrado")
    return updated
  })
}

export async function toggleFavorite(id: string, favorite: boolean): Promise<ActionResult<Link>> {
  return run(async (user) => {
    const updated = await db.updateLink(user.id, id, { favorite })
    if (!updated) throw new Error("Link não encontrado")
    return updated
  })
}

export async function deleteLink(id: string): Promise<ActionResult<Link>> {
  return run(async (user) => {
    const removed = await db.deleteLink(user.id, id)
    if (!removed) throw new Error("Link não encontrado")
    return removed
  })
}

export async function restoreLink(link: Link): Promise<ActionResult<Link>> {
  return run((user) => db.restoreLink(user.id, link))
}

export async function registerVisit(id: string): Promise<ActionResult> {
  return run((user) => db.registerVisit(user.id, id))
}

export async function checkDuplicate(url: string, ignoreId?: string): Promise<ActionResult<Link | null>> {
  return run((user) => (url ? db.findByUrl(user.id, url.trim(), ignoreId) : null))
}

export async function importLinks(items: unknown): Promise<ActionResult<{ imported: number; skipped: number }>> {
  return run(async (user) => {
    const list = Array.isArray(items) ? items : (items as { links?: unknown })?.links
    if (!Array.isArray(list)) throw new Error("Arquivo inválido: esperado uma lista de links")
    const valid = list.filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null && linkSchema.shape.url.safeParse((item as { url?: unknown }).url).success,
    )
    const result = await db.importLinks(user.id, valid)
    return { imported: result.imported, skipped: result.skipped + (list.length - valid.length) }
  })
}

export async function fetchMetadata(rawUrl: string): Promise<ActionResult<LinkMetadata>> {
  return run(() => fetchPageMetadata(rawUrl))
}
