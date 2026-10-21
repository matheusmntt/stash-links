export interface Link {
  id: string
  url: string
  title: string
  description?: string
  category: string
  tags: string[]
  favicon?: string
  favorite: boolean
  visits: number
  createdAt: string
  updatedAt: string
  lastVisitedAt?: string
}

export type LinkInput = {
  url: string
  title: string
  description?: string
  category: string
  tags: string[]
  favicon?: string
  favorite?: boolean
}

export interface LinkMetadata {
  title?: string
  description?: string
  favicon?: string
}

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string }

export const CATEGORIES = [
  "Documentação",
  "Ferramentas",
  "Artigos",
  "Estudo",
  "Repositórios",
  "Vídeos",
  "Inspiração",
  "Trabalho",
  "Outros",
] as const

export type Category = (typeof CATEGORIES)[number]

export type SortOption = "recent" | "oldest" | "title" | "visits"

export interface User {
  id: string
  email: string
  name: string
  createdAt: string
}

export interface SessionInfo {
  id: string
  kind: "web" | "api"
  label?: string
  createdAt: string
  lastUsedAt: string
  expiresAt: string
  current: boolean
}
