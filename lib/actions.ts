"use server"

import { promises as fs } from "fs"
import path from "path"
import crypto from "crypto"
import type { Link } from "./types"

const DATA_FILE = path.join(process.cwd(), "data", "links.json")

async function ensureDataFile() {
  const dir = path.dirname(DATA_FILE)
  try {
    await fs.access(dir)
  } catch {
    await fs.mkdir(dir, { recursive: true })
  }
  try {
    await fs.access(DATA_FILE)
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify([]))
  }
}

export async function getLinks(): Promise<Link[]> {
  await ensureDataFile()
  const data = await fs.readFile(DATA_FILE, "utf-8")
  return JSON.parse(data)
}

export async function addLink(link: Omit<Link, "id" | "createdAt">): Promise<Link> {
  await ensureDataFile()
  const links = await getLinks()
  const newLink: Link = {
    ...link,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  links.unshift(newLink)
  await fs.writeFile(DATA_FILE, JSON.stringify(links, null, 2))
  return newLink
}

export async function deleteLink(id: string): Promise<void> {
  await ensureDataFile()
  const links = await getLinks()
  const filtered = links.filter((link) => link.id !== id)
  await fs.writeFile(DATA_FILE, JSON.stringify(filtered, null, 2))
}

export async function updateLink(id: string, data: Partial<Omit<Link, "id" | "createdAt">>): Promise<Link | null> {
  await ensureDataFile()
  const links = await getLinks()
  const index = links.findIndex((link) => link.id === id)
  if (index === -1) return null
  links[index] = { ...links[index], ...data }
  await fs.writeFile(DATA_FILE, JSON.stringify(links, null, 2))
  return links[index]
}

export async function getAllTags(): Promise<string[]> {
  const links = await getLinks()
  const tagsSet = new Set<string>()
  links.forEach((link) => {
    link.tags?.forEach((tag) => tagsSet.add(tag))
  })
  return Array.from(tagsSet).sort()
}
