// Gera as screenshots do README (docs/screenshots/) com uma conta de demonstração.
//
//   pnpm screenshots
//
// Sobe o app já compilado (next start) com um banco SQLite temporário, ignorando o .env e as
// variáveis do Turso: nada é gravado no seu banco. Precisa de internet (favicons e títulos das
// páginas) e do Chromium do Playwright (`pnpm exec playwright install chromium`).

import { spawn } from "node:child_process"
import fs from "node:fs"
import net from "node:net"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import zlib from "node:zlib"
import { chromium } from "playwright"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "docs", "screenshots")
const DEMO_LINKS = path.join(ROOT, "scripts", "demo-links.json")
const USER = { name: "Marina Costa", email: "marina@exemplo.com", password: "demo-stash-123" }
// Página pública usada para mostrar o preenchimento automático e o popup da extensão
const SAMPLE_PAGE = "https://vite.dev/guide/"

const log = (message) => console.log(`• ${message}`)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "stash-screenshots-"))
let server
let browser
let extensionContext

async function main() {
  if (!fs.existsSync(path.join(ROOT, ".next", "BUILD_ID"))) {
    throw new Error("Build não encontrado. Rode `pnpm build` antes (ou use `pnpm screenshots`).")
  }
  fs.mkdirSync(OUT, { recursive: true })

  const port = await freePort()
  const base = `http://localhost:${port}`
  server = await startServer(port, base)
  log(`app rodando em ${base} com banco temporário`)

  browser = await chromium.launch()
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2, colorScheme: "dark" })
  const page = await desktop.newPage()

  await createDemoAccount(page, base)
  await captureApp(page, base)
  await captureMobile(desktop, base)
  await browser.close()
  browser = undefined

  await captureExtension(base)
  log(`screenshots salvas em ${path.relative(ROOT, OUT)}/`)
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

async function createDemoAccount(page, base) {
  await page.goto(base)
  await page.fill("#name", USER.name)
  await page.fill("#email", USER.email)
  await page.fill("#password", USER.password)
  await page.click("button[type=submit]")
  await page.getByText("Seu stash está vazio").waitFor()

  const file = path.join(tmp, "demo-links.json")
  fs.writeFileSync(file, JSON.stringify(withRecentDates(JSON.parse(fs.readFileSync(DEMO_LINKS, "utf8")))))
  await page.locator("aside input[type=file]").setInputFiles(file)
  await page.getByText(/importado/).waitFor()
  log(`conta ${USER.email} criada com ${await page.locator("article").count()} links`)
}

/** Desloca as datas para o link mais recente ser de ontem, mantendo o intervalo entre eles. */
function withRecentDates(links) {
  const newest = Math.max(...links.map((link) => Date.parse(link.createdAt)))
  const shift = Date.now() - 24 * 60 * 60 * 1000 - newest
  return links.map((link) => ({ ...link, createdAt: new Date(Date.parse(link.createdAt) + shift).toISOString() }))
}

async function setPrefs(page, { theme, view }) {
  await page.evaluate(
    ({ theme, view }) => {
      localStorage.setItem("theme", theme)
      localStorage.setItem("stash:prefs", JSON.stringify({ sort: "recent", view }))
    },
    { theme, view },
  )
  await page.reload()
  await settle(page)
}

async function captureApp(page, base) {
  // Lista no tema escuro, com um card em hover para mostrar as ações
  await setPrefs(page, { theme: "dark", view: "list" })
  await page.locator("article").nth(2).hover()
  await sleep(300)
  await shot(page, "app-dark.png")

  // Tema claro em grade, filtrando por uma tag
  await setPrefs(page, { theme: "light", view: "grid" })
  await page.locator("aside").getByRole("button", { name: /react/ }).first().click()
  await sleep(300)
  await shot(page, "app-light-grid.png")

  // Novo link com título e descrição preenchidos automaticamente
  await setPrefs(page, { theme: "dark", view: "list" })
  await page.keyboard.press("n")
  await page.fill("#link-url", SAMPLE_PAGE)
  await page.waitForFunction(() => document.querySelector("#link-title")?.value, null, { timeout: 15000 }).catch(() => {
    log("aviso: título automático não chegou (sem internet?)")
  })
  await page.getByRole("radio", { name: "Documentação" }).click()
  for (const tag of ["vite", "build"]) {
    await page.fill("#link-tags", tag)
    await page.keyboard.press("Enter")
  }
  await settle(page)
  await shot(page, "new-link.png")
  await page.keyboard.press("Escape")
}

async function captureMobile(desktop, base) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
    storageState: await desktop.storageState(),
  })
  const page = await context.newPage()
  await page.goto(base)
  await settle(page)
  await shot(page, "mobile.png")
  await page.getByRole("button", { name: "Abrir menu" }).click()
  await sleep(500)
  await shot(page, "mobile-menu.png")
  await context.close()
}

// ---------------------------------------------------------------------------
// Extensão (baixada do próprio app, como um usuário faria)
// ---------------------------------------------------------------------------

async function captureExtension(base) {
  const dir = path.join(tmp, "extension")
  const zip = Buffer.from(await (await fetch(`${base}/api/extension`)).arrayBuffer())
  extractZip(zip, dir)
  const extension = path.join(dir, "stash-extension")

  // Só para a automação: aberto por script, o popup não recebe activeTab como num clique real
  const manifestPath = path.join(extension, "manifest.json")
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))
  manifest.permissions.push("tabs")
  manifest.host_permissions = ["<all_urls>"]
  delete manifest.background.scripts
  fs.writeFileSync(manifestPath, JSON.stringify(manifest))

  extensionContext = await chromium.launchPersistentContext(path.join(tmp, "profile"), {
    // O "headless shell" padrão não carrega extensões; o Chromium completo, em modo headless, sim
    channel: "chromium",
    headless: true,
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  })
  const worker = extensionContext.serviceWorkers()[0] ?? (await extensionContext.waitForEvent("serviceworker"))
  const extensionId = new URL(worker.url()).host

  // Ao instalar, a extensão pré-configurada abre a autorização sozinha
  let connect
  for (let i = 0; i < 40 && !connect; i++) {
    connect = extensionContext.pages().find((p) => p.url().includes("/connect"))
    await sleep(250)
  }
  if (!connect) throw new Error("A extensão não abriu a tela de autorização")
  await connect.fill("#email", USER.email)
  await connect.fill("#password", USER.password)
  await connect.click("button[type=submit]")
  await connect.getByRole("button", { name: "Autorizar" }).waitFor()
  await settle(connect)
  await shot(connect, "extension-authorize.png")
  await connect.getByRole("button", { name: "Autorizar" }).click()
  await connect.getByText("Extensão conectada").waitFor()
  log("extensão conectada")

  const target = await extensionContext.newPage()
  await target.goto(SAMPLE_PAGE)
  await settle(target)
  const targetOrigin = new URL(SAMPLE_PAGE).origin

  const openPopup = async () => {
    const popup = await extensionContext.newPage()
    // O popup lê "a aba ativa"; aberto como página, apontamos para a aba de exemplo
    await popup.addInitScript((origin) => {
      const query = chrome.tabs.query.bind(chrome.tabs)
      chrome.tabs.query = async () => (await query({})).filter((tab) => tab.url?.startsWith(origin))
    }, targetOrigin)
    await popup.setViewportSize({ width: 390, height: 600 })
    await popup.goto(`chrome-extension://${extensionId}/popup.html`)
    await popup.locator("form.form").waitFor()
    return popup
  }

  const save = await openPopup()
  await save.getByRole("radio", { name: "Documentação" }).click()
  await save.fill(".tags-field input", "vite")
  await save.keyboard.press("Enter")
  await settle(save)
  await shot(save, "extension-save.png")

  const search = await openPopup()
  await search.click("#tab-search")
  await search.fill("input[type=search]", "react")
  await settle(search)
  await shot(search, "extension-search.png")

  await extensionContext.close()
  extensionContext = undefined
}

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name) })
  log(name)
}

async function settle(page) {
  await page.waitForLoadState("networkidle").catch(() => {})
  await sleep(600)
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.unref()
    srv.on("error", reject)
    srv.listen(0, () => {
      const { port } = srv.address()
      srv.close(() => resolve(port))
    })
  })
}

async function startServer(port, base) {
  const env = { ...process.env }
  // Nunca usar o banco real: sem Turso, com o SQLite temporário e sem carregar o .env
  delete env.TURSO_DATABASE_URL
  delete env.TURSO_AUTH_TOKEN
  delete env.VERCEL
  Object.assign(env, {
    __NEXT_PROCESSED_ENV: "true",
    STASH_DATA_DIR: path.join(tmp, "data"),
    ALLOW_SIGNUP: "true",
    APP_URL: base,
    PORT: String(port),
    NODE_ENV: "production",
  })

  const child = spawn(process.execPath, [path.join(ROOT, "node_modules", "next", "dist", "bin", "next"), "start"], {
    cwd: ROOT,
    env,
    stdio: ["ignore", "ignore", "pipe"],
  })
  let stderr = ""
  child.stderr.on("data", (chunk) => (stderr += chunk))

  for (let i = 0; i < 80; i++) {
    if (child.exitCode !== null) throw new Error(`O servidor encerrou ao iniciar:\n${stderr}`)
    try {
      await fetch(base)
      return child
    } catch {
      await sleep(250)
    }
  }
  throw new Error("O servidor não respondeu a tempo")
}

/** Extrai o .zip gerado por /api/extension (deflate, sem dependências). */
function extractZip(buffer, destination) {
  const end = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  const count = buffer.readUInt16LE(end + 10)
  let offset = buffer.readUInt32LE(end + 16)

  for (let i = 0; i < count; i++) {
    const method = buffer.readUInt16LE(offset + 10)
    const compressedSize = buffer.readUInt32LE(offset + 20)
    const nameLength = buffer.readUInt16LE(offset + 28)
    const extraLength = buffer.readUInt16LE(offset + 30)
    const commentLength = buffer.readUInt16LE(offset + 32)
    const localOffset = buffer.readUInt32LE(offset + 42)
    const name = buffer.toString("utf8", offset + 46, offset + 46 + nameLength)

    const localNameLength = buffer.readUInt16LE(localOffset + 26)
    const localExtraLength = buffer.readUInt16LE(localOffset + 28)
    const start = localOffset + 30 + localNameLength + localExtraLength
    const data = buffer.subarray(start, start + compressedSize)

    const file = path.join(destination, name)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, method === 8 ? zlib.inflateRawSync(data) : data)
    offset += 46 + nameLength + extraLength + commentLength
  }
}

async function cleanup() {
  await extensionContext?.close().catch(() => {})
  await browser?.close().catch(() => {})
  server?.kill()
  fs.rmSync(tmp, { recursive: true, force: true })
}

process.on("SIGINT", async () => {
  await cleanup()
  process.exit(130)
})

main()
  .then(cleanup)
  .catch(async (error) => {
    console.error(`\n✖ ${error.message}`)
    await cleanup()
    process.exit(1)
  })
