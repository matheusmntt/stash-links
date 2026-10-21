import { json, preflight } from "@/lib/api"

export const OPTIONS = preflight

/** Usado pela extensão para confirmar que o endereço informado é um servidor Stash. */
export function GET() {
  return json({ app: "stash", version: 1 })
}
