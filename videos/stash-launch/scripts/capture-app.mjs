// Captura a interface real do Stash para o vídeo de lançamento (capture/).
//
//   node scripts/capture-app.mjs        (a partir de videos/stash-launch, depois de `pnpm build` na raiz)
//
// Sobe o app compilado com um banco temporário (ignora .env e Turso), cria a conta de demonstração,
// importa scripts/demo-links.json da raiz e salva telas em 4K (1920x1080 @2x) e recortes de elementos
// em capture/assets/, além de capture/extracted/ (tokens, textos e inventário de assets).

import { spawn } from "node:child_process"
import fs from "node:fs"
import net from "node:net"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import zlib from "node:zlib"
import { createRequire } from "node:module"

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const ROOT = path.resolve(PROJECT, "..", "..")
const { chromium } = createRequire(path.join(ROOT, "package.json"))("playwright")

const ASSETS = path.join(PROJECT, "capture", "assets")
const EXTRACTED = path.join(PROJECT, "capture", "extracted")
const USER = { name: "Marina Costa", email: "marina@exemplo.com", password: "demo-stash-123" }
const SAMPLE_PAGE = "https://vite.dev/guide/"

const log = (message) => console.log(`• ${message}`)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "stash-capture-"))
const inventory = []
const layout = {}
let server
let browser
let extensionContext

async function main() {
  if (!fs.existsSync(path.join(ROOT, ".next", "BUILD_ID"))) throw new Error("Rode `pnpm build` na raiz do repositório antes.")
  fs.rmSync(path.join(PROJECT, "capture"), { recursive: true, force: true })
  fs.mkdirSync(ASSETS, { recursive: true })
  fs.mkdirSync(EXTRACTED, { recursive: true })

  const port = await freePort()
  const base = `http://localhost:${port}`
  server = await startServer(port, base)
  log(`app em ${base}`)

  browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2, colorScheme: "light" })
  const page = await context.newPage()

  // Login screen antes de existir conta (abre em "Criar conta")
  await page.goto(base)
  await createAccount(page, base)
  await setPrefs(page, { theme: "light", view: "list" })

  await measure(page, "app-list-light.png", {
    sidebar: "aside",
    categories: "aside nav > div:nth-of-type(2)",
    tags: "aside nav > div:nth-of-type(3)",
    header: "header",
    search: "header input[type=search]",
    list: "main",
    card1: "article >> nth=0",
    card2: "article >> nth=1",
    card3: "article >> nth=2",
  })
  await shot(page, "app-list-light.png", "Tela principal no tema claro: barra lateral (categorias com contadores, tags), busca, botão Novo link e lista de cards com favicon, título, domínio, descrição, categoria, tags, data e acessos. 1920x1080 @2x.")

  await page.locator("article").first().screenshot({ path: path.join(ASSETS, "card-react.png") })
  record("card-react.png", "Recorte de um card de link (React Reference, favorito, #react #frontend, 42 acessos). Bom para cartão de vidro.")
  await page.locator("article").nth(2).screenshot({ path: path.join(ASSETS, "card-shadcn.png") })
  record("card-shadcn.png", "Recorte do card shadcn/ui — Components (Ferramentas, #react #tailwind #ui, favorito).")
  await page.locator("article").nth(3).screenshot({ path: path.join(ASSETS, "card-useeffect.png") })
  record("card-useeffect.png", "Recorte do card A Complete Guide to useEffect (Artigos, #hooks #react).")
  await page.locator("aside").screenshot({ path: path.join(ASSETS, "sidebar.png") })
  record("sidebar.png", "Recorte da barra lateral inteira: Todos os links 15, Favoritos 3, 8 categorias com contadores, nuvem de tags, Instalar extensão, tema e usuário Marina Costa.")

  // Busca sem acento
  await page.keyboard.press("/")
  await page.keyboard.type("documentacao")
  await sleep(400)
  await measure(page, "app-search.png", { search: "header input[type=search]", heading: "main h2", results: "main .grid", card1: "article >> nth=0", card5: "article >> nth=4" })
  await shot(page, "app-search.png", "Busca digitando \"documentacao\" (sem acento) encontra os links da categoria Documentação. Mostra o chip de filtro de busca.")
  await page.keyboard.press("Escape")

  // Filtro por tag em grade
  await setPrefs(page, { theme: "light", view: "grid" })
  await page.locator("aside").getByRole("button", { name: /react/ }).first().click()
  await sleep(400)
  await shot(page, "app-grid-react.png", "Visualização em grade filtrada pela tag #react (4 links), chips de tag destacados.")

  // Favoritos
  await setPrefs(page, { theme: "light", view: "list" })
  await page.locator("aside").getByRole("button", { name: /Favoritos/ }).click()
  await sleep(400)
  await shot(page, "app-favorites.png", "Lista filtrada em Favoritos (3 links com estrela).")

  // Novo link com preenchimento automático
  await setPrefs(page, { theme: "light", view: "list" })
  await page.keyboard.press("n")
  await page.fill("#link-url", SAMPLE_PAGE)
  await page.waitForFunction(() => document.querySelector("#link-title")?.value, null, { timeout: 15000 }).catch(() => log("aviso: sem título automático"))
  await page.getByRole("radio", { name: "Documentação" }).click()
  for (const tag of ["vite", "build"]) {
    await page.fill("#link-tags", tag)
    await page.keyboard.press("Enter")
  }
  await settle(page)
  await shot(page, "app-new-link.png", "Diálogo Novo link: URL colada (vite.dev/guide), título \"Getting Started\" e descrição preenchidos automaticamente (selo \"automático\"), categoria Documentação, tags vite e build.")
  await measure(page, "app-new-link.png", { dialog: "[role=dialog]", url: "#link-url", title: "#link-title", description: "#link-description", categories: "[role=radiogroup]", tags: "#link-tags" })
  const dialogBox = layout["app-new-link.png"].dialog
  layout["dialog-new-link.png"] = Object.fromEntries(
    Object.entries(layout["app-new-link.png"]).map(([k, b]) => [k, { x: b.x - dialogBox.x, y: b.y - dialogBox.y, width: b.width, height: b.height }]),
  )
  await page.getByRole("dialog").screenshot({ path: path.join(ASSETS, "dialog-new-link.png") })
  record("dialog-new-link.png", "Recorte só do diálogo Novo link com preenchimento automático.")
  await page.keyboard.press("Escape")

  // Tema escuro (contraste para um corte)
  await setPrefs(page, { theme: "dark", view: "list" })
  await shot(page, "app-list-dark.png", "Mesma tela principal no tema escuro (azul-noite com teal).")
  await context.close()
  await browser.close()
  browser = undefined

  await captureExtension(base)
  writeExtracted()
  log(`capturas em ${path.relative(PROJECT, ASSETS)}/ (${inventory.length} assets)`)
}

async function createAccount(page, base) {
  await page.fill("#name", USER.name)
  await page.fill("#email", USER.email)
  await page.fill("#password", USER.password)
  await page.click("button[type=submit]")
  await page.getByText("Seu stash está vazio").waitFor()
  const links = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", "demo-links.json"), "utf8"))
  const newest = Math.max(...links.map((l) => Date.parse(l.createdAt)))
  const shift = Date.now() - 24 * 60 * 60 * 1000 - newest
  const file = path.join(tmp, "links.json")
  fs.writeFileSync(file, JSON.stringify(links.map((l) => ({ ...l, createdAt: new Date(Date.parse(l.createdAt) + shift).toISOString() }))))
  await page.locator("aside input[type=file]").setInputFiles(file)
  await page.getByText(/importado/).waitFor()
  await sleep(4500) // deixa o toast sumir
}

async function captureExtension(base) {
  const dir = path.join(tmp, "extension")
  extractZip(Buffer.from(await (await fetch(`${base}/api/extension`)).arrayBuffer()), dir)
  const extension = path.join(dir, "stash-extension")
  const manifestPath = path.join(extension, "manifest.json")
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))
  manifest.permissions.push("tabs")
  manifest.host_permissions = ["<all_urls>"]
  delete manifest.background.scripts
  fs.writeFileSync(manifestPath, JSON.stringify(manifest))

  extensionContext = await chromium.launchPersistentContext(path.join(tmp, "profile"), {
    channel: "chromium",
    headless: true,
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
    colorScheme: "light",
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  })
  const worker = extensionContext.serviceWorkers()[0] ?? (await extensionContext.waitForEvent("serviceworker"))
  const id = new URL(worker.url()).host

  let connect
  for (let i = 0; i < 40 && !connect; i++) {
    connect = extensionContext.pages().find((p) => p.url().includes("/connect"))
    await sleep(250)
  }
  await connect.fill("#email", USER.email)
  await connect.fill("#password", USER.password)
  await connect.click("button[type=submit]")
  await connect.getByRole("button", { name: "Autorizar" }).waitFor()
  await settle(connect)
  await shot(connect, "ext-authorize.png", "Tela do Stash para autorizar a extensão: ícones extensão ⇄ Stash, conta Marina Costa, permissões, botões Cancelar e Autorizar.")
  await connect.locator(".rounded-2xl.bg-card").first().screenshot({ path: path.join(ASSETS, "ext-authorize-card.png") })
  record("ext-authorize-card.png", "Recorte só do cartão de autorização (Conectar a extensão / Autorizar).")
  await connect.getByRole("button", { name: "Autorizar" }).click()
  await connect.getByText("Extensão conectada").waitFor()

  // Página real com o popup ao lado, para o "One More Thing"
  const target = await extensionContext.newPage()
  await target.goto(SAMPLE_PAGE)
  await settle(target)
  await shot(target, "page-vite.png", "Página pública vite.dev/guide (Getting Started | Vite) aberta no navegador: o contexto onde a extensão é usada.")

  const origin = new URL(SAMPLE_PAGE).origin
  const openPopup = async () => {
    const popup = await extensionContext.newPage()
    await popup.addInitScript((o) => {
      const query = chrome.tabs.query.bind(chrome.tabs)
      chrome.tabs.query = async () => (await query({})).filter((t) => t.url?.startsWith(o))
    }, origin)
    await popup.setViewportSize({ width: 390, height: 600 })
    await popup.goto(`chrome-extension://${id}/popup.html`)
    await popup.locator("form.form").waitFor()
    return popup
  }

  const save = await openPopup()
  await save.getByRole("radio", { name: "Documentação" }).click()
  await save.fill(".tags-field input", "vite")
  await save.keyboard.press("Enter")
  await settle(save)
  await measure(save, "ext-popup-save.png", { header: ".header", title: ".page-info .input", form: "form.form", submit: "button[type=submit]" })
  await shot(save, "ext-popup-save.png", "Popup da extensão (390x600 @2x), aba Salvar: título da aba (Getting Started | Vite) e descrição lidos da página, categoria Documentação, tag vite, botão Salvar link.")

  const search = await openPopup()
  await search.click("#tab-search")
  await search.fill("input[type=search]", "react")
  await settle(search)
  await shot(search, "ext-popup-search.png", "Popup da extensão, aba Buscar: \"react\" encontra 4 links, favoritos com estrela.")

  await save.click("button[type=submit]")
  await save.getByText("Salvo no Stash").waitFor().catch(() => {})
  await sleep(300)
  await shot(save, "ext-popup-saved.png", "Popup após salvar: confirmação \"Salvo no Stash\" com ícone de check.")

  await extensionContext.close()
  extensionContext = undefined
}

function writeExtracted() {
  fs.copyFileSync(path.join(ROOT, "app", "icon.svg"), path.join(ASSETS, "stash-icon.svg"))
  record("stash-icon.svg", "Ícone do Stash: quadrado arredondado com gradiente teal (#2ee6cf → #0fa89a) e marcador (bookmark) azul-noite. Logo do produto.")

  const tokens = {
    title: "Stash",
    description: "Salve e organize documentações, ferramentas e posts em um só lugar",
    colors: ["#14b8a6", "#0f766e", "#2ee6cf", "#0b1120", "#f9fafb", "#ffffff", "#e5e7eb", "#d97706"],
    fonts: ["Inter", "JetBrains Mono"],
  }
  // Cores só da marca (o mapeamento do preset trata a primeira saturada como acento)
  tokens.colors = ["#0f9e8f", "#0b1120", "#f4f2ee"]
  fs.writeFileSync(path.join(EXTRACTED, "tokens.json"), JSON.stringify(tokens, null, 2) + "\n")
  fs.writeFileSync(path.join(EXTRACTED, "layout.json"), JSON.stringify(layout, null, 2) + "\n")

  const readme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8").replace(/<[^>]+>/g, "").replace(/!\[[^\]]*\]\([^)]*\)/g, "")
  fs.writeFileSync(path.join(EXTRACTED, "visible-text.txt"), readme)

  const lines = [
    "# Asset descriptions",
    "",
    "Capturas reais do app Stash rodando localmente (Next.js) com a conta de demonstração Marina Costa e 15 links",
    "(docs, ferramentas, artigos, repositórios, vídeos, inspiração, trabalho). Telas 1920x1080 @2x (3840x2160)",
    "para zoom de câmera; recortes de elementos a @2x. Tema claro, exceto onde indicado.",
    "",
    ...inventory.map(({ file, description }) => `- \`assets/${file}\` — ${description}`),
    "",
  ]
  fs.writeFileSync(path.join(EXTRACTED, "asset-descriptions.md"), lines.join("\n"))
}

// ---------------------------------------------------------------------------

/** Caixas (px CSS, viewport 1920x1080) dos elementos que os zooms do vídeo miram. */
async function measure(page, shotName, selectors) {
  const boxes = {}
  for (const [name, selector] of Object.entries(selectors)) {
    const box = await page.locator(selector).first().boundingBox().catch(() => null)
    if (box) boxes[name] = Object.fromEntries(Object.entries(box).map(([k, v]) => [k, Math.round(v)]))
  }
  layout[shotName] = boxes
}

function record(file, description) {
  inventory.push({ file, description })
  log(file)
}

async function shot(page, name, description) {
  await page.screenshot({ path: path.join(ASSETS, name) })
  record(name, description)
}

async function settle(page) {
  await page.waitForLoadState("networkidle").catch(() => {})
  await sleep(700)
}

async function setPrefs(page, { theme, view }) {
  await page.evaluate(({ theme, view }) => {
    localStorage.setItem("theme", theme)
    localStorage.setItem("stash:prefs", JSON.stringify({ sort: "recent", view }))
  }, { theme, view })
  await page.reload()
  await settle(page)
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
    const start = localOffset + 30 + buffer.readUInt16LE(localOffset + 26) + buffer.readUInt16LE(localOffset + 28)
    const file = path.join(destination, name)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    const data = buffer.subarray(start, start + compressedSize)
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

main()
  .then(cleanup)
  .catch(async (error) => {
    console.error(`\n✖ ${error.stack || error.message}`)
    await cleanup()
    process.exit(1)
  })
