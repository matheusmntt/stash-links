import type { LinkMetadata } from "./types"

// ---------------------------------------------------------------------------

const MAX_HTML_BYTES = 512 * 1024

function isPrivateHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname.endsWith(".local") ||
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
    hostname === "[::1]"
  )
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
}

function getAttr(tag: string, attr: string): string | undefined {
  const match = tag.match(new RegExp(`${attr}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"))
  return match ? (match[2] ?? match[3] ?? match[4]) : undefined
}

function findMeta(html: string, keys: string[]): string | undefined {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = (getAttr(tag, "property") ?? getAttr(tag, "name"))?.toLowerCase()
    if (key && keys.includes(key)) {
      const content = getAttr(tag, "content")
      if (content) return decodeEntities(content)
    }
  }
}

function findIcon(html: string, baseUrl: URL): string {
  const icons = (html.match(/<link\b[^>]*>/gi) ?? [])
    .filter((tag) => /\brel\s*=\s*["']?[^"'>]*icon/i.test(tag))
    .map((tag) => ({ href: getAttr(tag, "href"), apple: /apple-touch-icon/i.test(tag) }))
    .filter((icon): icon is { href: string; apple: boolean } => Boolean(icon.href))

  const chosen = icons.find((icon) => !icon.apple) ?? icons[0]
  try {
    return new URL(chosen?.href ?? "/favicon.ico", baseUrl).toString()
  } catch {
    return new URL("/favicon.ico", baseUrl).toString()
  }
}

async function readLimited(response: Response): Promise<string> {
  if (!response.body) return ""
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  while (size < MAX_HTML_BYTES) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    size += value.length
  }
  reader.cancel().catch(() => {})
  return new TextDecoder().decode(Buffer.concat(chunks))
}

export async function fetchPageMetadata(rawUrl: string): Promise<LinkMetadata> {
  const url = new URL(rawUrl.trim())
  if (!/^https?:$/.test(url.protocol) || isPrivateHost(url.hostname)) throw new Error("URL não suportada")

  const response = await fetch(url, {
    signal: AbortSignal.timeout(6000),
    redirect: "follow",
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; StashBot/1.0; +https://github.com)",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    },
  })

  const finalUrl = new URL(response.url || url)
  if (!response.ok || !(response.headers.get("content-type") ?? "").includes("html")) {
    return { favicon: new URL("/favicon.ico", finalUrl).toString() }
  }

  const html = await readLimited(response)
  const rawTitle = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]

  return {
    title: findMeta(html, ["og:title", "twitter:title"]) ?? (rawTitle ? decodeEntities(rawTitle) : undefined),
    description: findMeta(html, ["description", "og:description", "twitter:description"]),
    favicon: findIcon(html, finalUrl),
  }
}
