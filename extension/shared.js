// Código compartilhado entre popup, opções e service worker

import { PRECONFIGURED, SERVER_URL } from "./config.js"

export { PRECONFIGURED }
export const DEFAULT_SERVER = SERVER_URL
export const FALLBACK_CATEGORY = "Outros"

export async function getConfig() {
  const config = await chrome.storage.local.get(["serverUrl", "token", "email", "defaultCategory", "lastCategory"])
  return {
    // Baixada pelo Stash, a extensão já sabe o endereço do servidor
    serverUrl: config.serverUrl || (PRECONFIGURED ? SERVER_URL : ""),
    token: config.token || "",
    email: config.email || "",
    defaultCategory: config.defaultCategory || FALLBACK_CATEGORY,
    lastCategory: config.lastCategory || "",
  }
}

export function setConfig(values) {
  return chrome.storage.local.set(values)
}

export function normalizeServerUrl(value) {
  const url = new URL(value.trim())
  if (!/^https?:$/.test(url.protocol)) throw new Error("Use um endereço http(s)")
  return url.origin
}

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.status = status
    this.data = data
  }
}

/** Chama a API do Stash (/api/v1) com o token salvo. */
export async function api(path, { method = "GET", body, serverUrl, token } = {}) {
  const config = serverUrl ? { serverUrl, token } : await getConfig()
  if (!config.serverUrl) throw new ApiError("NOT_CONFIGURED", 0)

  let response
  try {
    response = await fetch(`${config.serverUrl}/api/v1${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError("OFFLINE", 0)
  }

  const data = await response.json().catch(() => ({}))
  if (response.status === 401 && path !== "/token") {
    // Token revogado (senha trocada ou sessão removida no app): esquece para pedir login de novo
    await chrome.storage.local.remove("token")
    throw new ApiError("UNAUTHORIZED", 401, data)
  }
  if (!response.ok) throw new ApiError(data.error || `Erro ${response.status}`, response.status, data)
  return data
}

export function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

export function normalizeText(text) {
  return (text || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
}

export function cleanTag(value) {
  return value.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, "-").replace(/,/g, "")
}

export function isSavableUrl(url) {
  return /^https?:\/\//i.test(url || "")
}

/** Mesmo critério do servidor: "https://x.com/a" e "https://x.com/a/" são o mesmo link. */
export function sameUrl(a, b) {
  return a.replace(/\/+$/, "") === b.replace(/\/+$/, "")
}

/** Cria elementos sem innerHTML, para títulos de páginas nunca virarem HTML. */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag)
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue
    if (key === "class") el.className = value
    else if (key.startsWith("on")) el.addEventListener(key.slice(2).toLowerCase(), value)
    else if (key in el && typeof value !== "string") el[key] = value
    else el.setAttribute(key, value === true ? "" : value)
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue
    el.append(child instanceof Node ? child : document.createTextNode(String(child)))
  }
  return el
}

const ICONS = {
  star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
  external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  settings:
    '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  hash: '<line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/>',
  bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
  alert: '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
  plug: '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>',
}

export function icon(name, className = "icon") {
  const span = document.createElement("span")
  span.className = className
  span.setAttribute("aria-hidden", "true")
  // Conteúdo estático e fixo (não vem de dados externos)
  span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`
  return span
}

// ---------------------------------------------------------------------------
// Conexão com a conta (fluxo de autorização pelo navegador)
// ---------------------------------------------------------------------------

/** Confirma que o endereço responde como um servidor Stash. */
export async function checkServer(serverUrl) {
  try {
    const response = await fetch(`${serverUrl}/api/v1/ping`)
    const data = await response.json()
    return data?.app === "stash"
  } catch {
    return false
  }
}

/**
 * Abre o Stash numa aba para a pessoa autorizar a extensão. Depois de autorizar, o Stash
 * redireciona para connected.html com o token, que confere o `state` antes de salvar.
 */
export async function startConnect(serverUrl) {
  const state = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "")
  await chrome.storage.local.set({ pendingConnect: { state, serverUrl, createdAt: Date.now() } })

  const params = new URLSearchParams({
    redirect: chrome.runtime.getURL("connected.html"),
    state,
    label: browserLabel(),
  })
  await chrome.tabs.create({ url: `${serverUrl}/connect?${params}` })
}

/** Nome exibido em "Minha conta → Sessões" no app, ex.: "Extensão · Chrome no macOS". */
export function browserLabel() {
  const ua = navigator.userAgent
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /OPR\//.test(ua) ? "Opera" : "Chrome"
  const os = /Mac OS X/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : ""
  return `Extensão · ${browser}${os ? ` no ${os}` : ""}`
}
