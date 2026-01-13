export interface Link {
  id: string
  url: string
  title: string
  description?: string
  category: string
  tags: string[]
  createdAt: string
}

export const CATEGORIES = [
  "Trabalho",
  "Estudo",
  "Ferramentas",
  "Inspiração",
  "Leitura",
  "Entretenimento",
  "Outros",
] as const

export type Category = (typeof CATEGORIES)[number]
