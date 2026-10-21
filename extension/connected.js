import { h, icon, setConfig } from "./shared.js"

const card = document.getElementById("card")
// Pedidos de conexão expiram para um link antigo não ser reaproveitado
const MAX_AGE_MS = 15 * 60 * 1000

finish()

async function finish() {
  const params = new URLSearchParams(location.hash.slice(1))
  // Remove o token da barra de endereço/histórico assim que lido
  history.replaceState(null, "", location.pathname)

  const { pendingConnect: pending } = await chrome.storage.local.get("pendingConnect")
  await chrome.storage.local.remove("pendingConnect")

  const state = params.get("state")
  const validRequest = pending && state && pending.state === state && Date.now() - pending.createdAt < MAX_AGE_MS

  if (params.get("error") === "access_denied") {
    return render("error", "Conexão cancelada", "Você pode conectar quando quiser pelas configurações da extensão.")
  }
  if (!validRequest || !params.get("token")) {
    return render("error", "Não foi possível conectar", "Esse pedido de conexão expirou ou não foi iniciado por esta extensão. Tente de novo.")
  }

  await setConfig({ serverUrl: pending.serverUrl, token: params.get("token"), email: params.get("email") || "" })
  render(
    "success",
    "Extensão conectada",
    `Tudo pronto, ${params.get("name") || "você"}! Clique no ícone do Stash na barra do navegador para salvar links.`,
  )
}

function render(kind, title, message) {
  const success = kind === "success"
  card.replaceChildren(
    h("div", { class: `badge${success ? "" : " error"}` }, icon(success ? "check" : "alert")),
    h("h1", {}, title),
    h("p", {}, message),
    h(
      "div",
      { class: "actions" },
      success
        ? h("button", { class: "btn", onClick: closeTab }, "Fechar aba")
        : h("button", { class: "btn", onClick: () => chrome.runtime.openOptionsPage() }, "Abrir configurações"),
    ),
    success ? h("p", { class: "tip" }, "Dica: fixe o ícone da extensão (🧩 → 📌) para ter acesso rápido.") : null,
  )
}

async function closeTab() {
  const tab = await chrome.tabs.getCurrent()
  if (tab?.id) chrome.tabs.remove(tab.id)
  else window.close()
}
