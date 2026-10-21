import { ApiError, PRECONFIGURED, DEFAULT_SERVER, api, getConfig, isSavableUrl, startConnect } from "./shared.js"

const MENU_PAGE = "stash-save-page"
const MENU_LINK = "stash-save-link"

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: MENU_PAGE, title: "Salvar esta página no Stash", contexts: ["page"] })
    chrome.contextMenus.create({ id: MENU_LINK, title: "Salvar link no Stash", contexts: ["link"] })
  })

  // Primeira instalação: se já veio configurada, vai direto para a autorização; senão, para as configurações
  if (reason === "install") {
    if (PRECONFIGURED) startConnect(DEFAULT_SERVER)
    else chrome.runtime.openOptionsPage()
  }
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const isLink = info.menuItemId === MENU_LINK
  const url = isLink ? info.linkUrl : info.pageUrl || tab?.url
  if (!isSavableUrl(url)) return flash(tab?.id, "!", "Só é possível salvar páginas http(s)")

  const config = await getConfig()
  if (!config.serverUrl || !config.token) {
    chrome.runtime.openOptionsPage()
    return
  }

  try {
    await api("/links", {
      method: "POST",
      body: {
        url,
        // Para a página atual já temos o título; para links o servidor busca na página
        title: isLink ? "" : tab?.title || "",
        category: config.defaultCategory,
        favicon: !isLink && isSavableUrl(tab?.favIconUrl) ? tab.favIconUrl : undefined,
        autoMeta: true,
      },
    })
    flash(tab?.id, "✓", "Salvo no Stash")
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) return flash(tab?.id, "✓", "Esse link já estava no Stash")
    if (error instanceof ApiError && error.message === "UNAUTHORIZED") chrome.runtime.openOptionsPage()
    const message = error.message === "OFFLINE" ? "Não foi possível conectar ao Stash" : error.message
    flash(tab?.id, "!", message, true)
  }
})

/** Feedback rápido no ícone da extensão. */
function flash(tabId, text, title, isError = false) {
  const target = tabId ? { tabId } : {}
  chrome.action.setBadgeBackgroundColor({ ...target, color: isError ? "#dc2626" : "#14b8a6" })
  chrome.action.setBadgeText({ ...target, text })
  chrome.action.setTitle({ ...target, title })
  setTimeout(() => {
    chrome.action.setBadgeText({ ...target, text: "" })
    chrome.action.setTitle({ ...target, title: "Salvar no Stash" })
  }, 2500)
}
