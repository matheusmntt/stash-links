import {
  DEFAULT_SERVER,
  FALLBACK_CATEGORY,
  PRECONFIGURED,
  api,
  browserLabel,
  checkServer,
  getConfig,
  h,
  normalizeServerUrl,
  setConfig,
  startConnect,
} from "./shared.js"

const $ = (id) => document.getElementById(id)

async function render() {
  const config = await getConfig()
  const connected = Boolean(config.serverUrl && config.token)

  $("connect-card").hidden = connected
  $("connected").hidden = !connected
  $("prefs").hidden = !connected

  if (!connected) {
    if (!$("server").value) $("server").value = config.serverUrl || DEFAULT_SERVER
    // Endereço veio do download do Stash: não precisa digitar nada
    const preset = PRECONFIGURED && $("server").value === DEFAULT_SERVER && !$("server-field").dataset.manual
    $("server-preset").hidden = !preset
    $("server-field").hidden = preset
    $("preset-url").textContent = DEFAULT_SERVER
    if (config.email && !$("email").value) $("email").value = config.email
    return
  }

  $("waiting").hidden = true
  $("server-label").textContent = config.serverUrl
  $("user-label").textContent = config.email || "Conectado"

  const commands = await chrome.commands.getAll()
  const shortcut = commands.find((c) => c.name === "_execute_action")?.shortcut
  $("shortcut").textContent = shortcut || "não definido"

  let categories = [FALLBACK_CATEGORY]
  try {
    categories = (await api("/links")).categories
  } catch {}
  $("default-category").replaceChildren(
    ...categories.map((cat) => h("option", { value: cat, selected: cat === config.defaultCategory }, cat)),
  )
}

function showError(id, message) {
  $(id).textContent = message
  $(id).hidden = !message
}

/** Valida o endereço e confirma que é um servidor Stash antes de seguir. */
async function resolveServer(errorId) {
  let serverUrl
  try {
    serverUrl = normalizeServerUrl($("server").value)
  } catch {
    showError(errorId, "Endereço inválido. Ex.: http://localhost:3000")
    return null
  }
  if (!(await checkServer(serverUrl))) {
    showError(errorId, `Não encontramos um Stash em ${serverUrl}. Confira o endereço e se o servidor está rodando.`)
    return null
  }
  return serverUrl
}

$("change-server").addEventListener("click", (e) => {
  e.preventDefault()
  $("server-field").dataset.manual = "true"
  $("server-preset").hidden = true
  $("server-field").hidden = false
  $("server").select()
})

$("server").addEventListener("input", () => {
  showError("connect-error", "")
  showError("password-error", "")
})

// Fluxo principal: autorizar pelo navegador
$("connect-form").addEventListener("submit", async (e) => {
  e.preventDefault()
  showError("connect-error", "")
  const button = $("connect-btn")
  button.disabled = true
  button.textContent = "Verificando..."
  try {
    const serverUrl = await resolveServer("connect-error")
    if (!serverUrl) return
    await setConfig({ serverUrl })
    await startConnect(serverUrl)
    $("waiting").hidden = false
  } finally {
    button.disabled = false
    button.textContent = "Conectar com o Stash"
  }
})

// Alternativa: e-mail e senha direto na extensão
$("password-form").addEventListener("submit", async (e) => {
  e.preventDefault()
  showError("password-error", "")
  const button = $("password-btn")
  button.disabled = true
  button.textContent = "Entrando..."
  try {
    const serverUrl = await resolveServer("password-error")
    if (!serverUrl) return
    const { token, user } = await api("/token", {
      method: "POST",
      serverUrl,
      body: { email: $("email").value, password: $("password").value, label: browserLabel() },
    })
    $("password").value = ""
    await setConfig({ serverUrl, token, email: user.email })
  } catch (err) {
    showError("password-error", err.message === "OFFLINE" ? "Não foi possível conectar ao servidor" : err.message)
  } finally {
    button.disabled = false
    button.textContent = "Entrar"
  }
})

$("disconnect").addEventListener("click", async () => {
  // Revoga o token no servidor; se estiver fora do ar, ao menos esquece localmente
  await api("/token", { method: "DELETE" }).catch(() => {})
  await chrome.storage.local.remove("token")
})

$("open-app").addEventListener("click", async () => {
  const { serverUrl } = await getConfig()
  chrome.tabs.create({ url: serverUrl })
})

$("default-category").addEventListener("change", (e) => setConfig({ defaultCategory: e.target.value }))

$("edit-shortcut").addEventListener("click", (e) => {
  e.preventDefault()
  chrome.tabs.create({ url: "chrome://extensions/shortcuts" })
})

// Atualiza a tela quando a conexão termina em outra aba (connected.html) ou é desfeita
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && "token" in changes) render()
})

render()
