import type { Link, SortOption } from "./types"
import { CATEGORIES } from "./types"

export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

/** Minúsculas e sem acentos, para a busca encontrar "documentacao" em "Documentação". */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
}

export interface LinkFilters {
  search: string
  category: string | null
  tag: string | null
  favoritesOnly: boolean
}

export function filterLinks(links: Link[], { search, category, tag, favoritesOnly }: LinkFilters): Link[] {
  const terms = normalizeText(search).split(/\s+/).filter(Boolean)

  return links.filter((link) => {
    if (favoritesOnly && !link.favorite) return false
    if (category && link.category !== category) return false
    if (tag && !link.tags.includes(tag)) return false
    if (terms.length === 0) return true

    const haystack = normalizeText(
      [link.title, link.description, link.url, link.category, ...link.tags.map((t) => `#${t}`)].join(" "),
    )
    return terms.every((term) => haystack.includes(term))
  })
}

export function sortLinks(links: Link[], sort: SortOption): Link[] {
  const sorted = [...links]
  switch (sort) {
    case "oldest":
      return sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    case "title":
      return sorted.sort((a, b) => a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" }))
    case "visits":
      return sorted.sort((a, b) => b.visits - a.visits || b.createdAt.localeCompare(a.createdAt))
    default:
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
}

export function countBy<T extends string>(values: T[]): Map<T, number> {
  const counts = new Map<T, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return counts
}

/** Categorias padrão + qualquer categoria antiga que exista nos dados. */
export function getCategories(links: Link[]): string[] {
  const extra = links.map((l) => l.category).filter((c) => !(CATEGORIES as readonly string[]).includes(c))
  return [...CATEGORIES, ...Array.from(new Set(extra)).sort()]
}

export const SORT_LABELS: Record<SortOption, string> = {
  recent: "Mais recentes",
  oldest: "Mais antigos",
  title: "Título (A–Z)",
  visits: "Mais acessados",
}
