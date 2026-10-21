import { z } from "zod"

export const linkSchema = z.object({
  url: z
    .string()
    .trim()
    .url("URL inválida")
    .refine((value) => /^https?:\/\//i.test(value), "Use uma URL http(s)"),
  title: z.string().trim().min(1, "Informe um título").max(300),
  description: z.string().trim().max(2000).optional(),
  category: z.string().trim().min(1, "Escolha uma categoria").max(60),
  tags: z.array(z.string()).max(30).default([]),
  favicon: z.string().trim().url().optional().or(z.literal("").transform(() => undefined)),
  favorite: z.boolean().optional(),
})

export type LinkPayload = z.infer<typeof linkSchema>
