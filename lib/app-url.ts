/**
 * Endereço público do Stash, usado para configurar a extensão.
 * Ordem: APP_URL → domínio de produção da Vercel → origem da própria requisição.
 */
export function getAppUrl(request?: Request): string {
  const configured = process.env.APP_URL?.trim()
  if (configured) return configured.replace(/\/+$/, "")

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercel) return `https://${vercel}`

  return request ? new URL(request.url).origin : "http://localhost:3000"
}
