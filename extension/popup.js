import {
  ApiError,
  api,
  cleanTag,
  getConfig,
  getDomain,
  h,
  icon,
  isSavableUrl,
  normalizeText,
  sameUrl,
  setConfig,
  startConnect,
} from "./shared.js"

const view = document.getElementById("view")
const tabSave = document.getElementById("tab-save")
const tabSearch = document.getElementById("tab-search")

const state = {
  config: null,
  data: null, // { links, categories, tags }
  page: null, // { url, title, description, favicon }
  tab: "save",
}

document.getElementById("open-app").append(icon("external"))
document.getElementById("open-options").append(icon("settings"))
document.getElementById("open-options").addEventListener("click", () => chrome.runtime.openOptionsPage())
document.getElementById("open-app").addEventListener("click", () => {
  if (state.config?.serverUrl) openUrl(state.config.serverUrl)
  else chrome.runtime.openOptionsPage()
})
tabSave.addEventListener("click", () => switchTab("save"))
tabSearch.addEventListener("click", () => switchTab("search"))

init()

async function init() {
  state.config = await getConfig()
  if (!state.config.serverUrl || !state.config.token) return renderSetup()

  try {
    const [data, page] = await Promise.all([api("/links"), readCurrentPage()])
    state.data = data
    state.page = page
    render()
  } catch (error) {
    renderError(error)
  }
}

function switchTab(tab) {
  state.tab = tab
  tabSave.setAttribute("aria-selected", String(tab === "save"))
  tabSearch.setAttribute("aria-selected", String(tab === "search"))
  if (state.data) render()
}

function render() {
  view.replaceChildren(state.tab === "save" ? renderSave() : renderSearch())
}

function openUrl(url) {
  chrome.tabs.create({ url })
  window.close()
}

/** Lê título, descrição e favicon da aba atual (activeTab permite isso ao abrir o popup). */
async function readCurrentPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const page = { url: tab?.url || "", title: tab?.title || "", description: "", favicon: tab?.favIconUrl || "" }
  if (!tab?.id || !isSavableUrl(page.url)) return page

  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const meta = (name) =>
          document.querySelector(`meta[name="${name}"], meta[property="${name}"]`)?.getAttribute("content")?.trim()
        const icon = document.querySelector('link[rel~="icon"]')
        return {
          description: meta("description") || meta("og:description") || "",
          favicon: icon ? icon.href : "",
        }
      },
    })
    page.description = result?.description || ""
    if (!page.favicon || page.favicon.startsWith("data:")) page.favicon = result?.favicon || page.favicon
  } catch {
    // Páginas restritas (loja de extensões, PDFs etc.): segue só com os dados da aba
  }
  return page
}

// ---------------------------------------------------------------------------
// Estados
// ---------------------------------------------------------------------------

function renderSetup(message) {
  const serverUrl = state.config?.serverUrl
  const connect = async () => {
    if (!serverUrl) return chrome.runtime.openOptionsPage()
    await startConnect(serverUrl)
    window.close()
  }

  view.replaceChildren(
    h(
      "div",
      { class: "center" },
      h("div", { class: "empty-icon" }, icon("plug")),
      h("h2", {}, message ? "Conecte novamente" : "Conecte ao seu Stash"),
      h(
        "p",
        {},
        message ||
          (serverUrl
            ? `Entre na sua conta em ${serverUrl} e autorize a extensão.`
            : "Informe o endereço do seu Stash e autorize a extensão na sua conta."),
      ),
      h("button", { class: "btn", onClick: connect }, serverUrl ? "Conectar com o Stash" : "Configurar"),
      serverUrl
        ? h(
            "button",
            { class: "btn ghost", style: "height:28px;font-size:12px", onClick: () => chrome.runtime.openOptionsPage() },
            "Usar outro endereço",
          )
        : null,
    ),
  )
}

function renderError(error) {
  if (error instanceof ApiError && error.message === "UNAUTHORIZED") {
    return renderSetup("Sua conexão expirou ou foi revogada. Conecte de novo para continuar.")
  }
  const offline = error instanceof ApiError && error.message === "OFFLINE"
  view.replaceChildren(
    h(
      "div",
      { class: "center" },
      h("div", { class: "empty-icon" }, icon("alert")),
      h("h2", {}, offline ? "Stash fora do ar" : "Algo deu errado"),
      h("p", {}, offline ? `Não foi possível conectar a ${state.config.serverUrl}.` : error.message),
      h("button", { class: "btn outline", onClick: () => location.reload() }, "Tentar novamente"),
    ),
  )
}

function favicon(url, src) {
  const box = h("div", { class: "favicon" }, getDomain(url).charAt(0) || "?")
  const sources = [src, isSavableUrl(url) ? `${new URL(url).origin}/favicon.ico` : ""].filter(Boolean)
  const tryNext = () => {
    const next = sources.shift()
    if (!next) return
    const img = h("img", { alt: "", referrerpolicy: "no-referrer", src: next })
    img.style.opacity = "0"
    img.addEventListener("load", () => {
      img.style.opacity = "1"
      box.firstChild.nodeType === Node.TEXT_NODE && (box.firstChild.textContent = "")
    })
    img.addEventListener("error", () => {
      img.remove()
      tryNext()
    })
    box.append(img)
  }
  tryNext()
  return box
}

// ---------------------------------------------------------------------------
// Salvar
// ---------------------------------------------------------------------------

function renderSave() {
  const { page, data, config } = state

  if (!isSavableUrl(page.url)) {
    return h(
      "div",
      { class: "center" },
      h("div", { class: "empty-icon" }, icon("bookmark")),
      h("h2", {}, "Esta página não pode ser salva"),
      h("p", {}, "Só é possível salvar páginas http(s). Use a aba Buscar para encontrar seus links."),
      h("button", { class: "btn outline", onClick: () => switchTab("search") }, "Buscar links"),
    )
  }

  const existing = data.links.find((link) => sameUrl(link.url, page.url))
  if (existing) {
    return h(
      "div",
      { class: "form" },
      h(
        "div",
        { class: "page" },
        favicon(existing.url, existing.favicon),
        h(
          "div",
          { class: "page-info" },
          h("strong", {}, existing.title),
          h("div", { class: "page-domain mono muted" }, getDomain(existing.url)),
        ),
      ),
      h(
        "div",
        { class: "notice" },
        icon("check"),
        h(
          "div",
          {},
          h("strong", {}, "Já está no seu Stash"),
          h(
            "span",
            { class: "muted" },
            `${existing.category}${existing.tags.length ? " · " + existing.tags.map((t) => "#" + t).join(" ") : ""}`,
          ),
        ),
      ),
      h(
        "div",
        { class: "footer" },
        h("span", { style: "margin-right:auto" }),
        h("button", { class: "btn outline", onClick: () => switchTab("search") }, icon("search"), "Buscar"),
        h("button", { class: "btn", onClick: () => openUrl(config.serverUrl) }, icon("external"), "Abrir no Stash"),
      ),
    )
  }

  // Estado do formulário
  const form = {
    title: page.title,
    description: page.description,
    category: data.categories.includes(config.lastCategory) ? config.lastCategory : "",
    tags: [],
    favorite: false,
  }

  const titleInput = h("input", {
    class: "input",
    value: form.title,
    placeholder: "Título",
    "aria-label": "Título",
    onInput: (e) => (form.title = e.target.value),
  })

  const description = h("textarea", {
    class: "input",
    rows: 2,
    placeholder: "Por que vale guardar este link? (opcional)",
    onInput: (e) => (form.description = e.target.value),
  })
  description.value = form.description

  const categoryChips = h("div", { class: "chips", role: "radiogroup", "aria-label": "Categoria" })
  const renderCategories = () =>
    categoryChips.replaceChildren(
      ...data.categories.map((cat) =>
        h(
          "button",
          {
            type: "button",
            class: "chip",
            role: "radio",
            "aria-checked": String(form.category === cat),
            onClick: () => {
              form.category = cat
              renderCategories()
            },
          },
          cat,
        ),
      ),
    )
  renderCategories()

  // Tags
  const tagInput = h("input", { placeholder: "react, api, css...", "aria-label": "Tags" })
  const tagsField = h("div", { class: "tags-field", onClick: () => tagInput.focus() })
  const suggestions = h("div", { class: "chips" })

  const addTag = (value) => {
    const tag = cleanTag(value)
    if (tag && !form.tags.includes(tag)) form.tags.push(tag)
    tagInput.value = ""
    renderTags()
  }

  const renderTags = () => {
    tagsField.replaceChildren(
      icon("hash"),
      ...form.tags.map((tag) =>
        h(
          "span",
          { class: "tag" },
          tag,
          h(
            "button",
            {
              type: "button",
              "aria-label": `Remover ${tag}`,
              onClick: () => {
                form.tags = form.tags.filter((t) => t !== tag)
                renderTags()
              },
            },
            icon("x"),
          ),
        ),
      ),
      tagInput,
    )
    tagInput.placeholder = form.tags.length ? "" : "react, api, css..."
    const query = normalizeText(cleanTag(tagInput.value))
    suggestions.replaceChildren(
      ...data.tags
        .filter((tag) => !form.tags.includes(tag) && (!query || normalizeText(tag).includes(query)))
        .slice(0, 6)
        .map((tag) =>
          h(
            "button",
            {
              type: "button",
              class: "suggestion",
              onMousedown: (e) => e.preventDefault(),
              onClick: () => {
                addTag(tag)
                tagInput.focus()
              },
            },
            `+ ${tag}`,
          ),
        ),
    )
  }

  tagInput.addEventListener("input", renderTags)
  tagInput.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === "," || e.key === "Tab") && tagInput.value.trim()) {
      e.preventDefault()
      addTag(tagInput.value)
    } else if (e.key === "Backspace" && !tagInput.value && form.tags.length) {
      form.tags.pop()
      renderTags()
    }
  })
  renderTags()

  const favToggle = h(
    "button",
    {
      type: "button",
      class: "fav-toggle",
      "aria-pressed": "false",
      onClick: () => {
        form.favorite = !form.favorite
        favToggle.setAttribute("aria-pressed", String(form.favorite))
        favLabel.textContent = form.favorite ? "Favorito" : "Favoritar"
      },
    },
    icon("star"),
  )
  const favLabel = h("span", {}, "Favoritar")
  favToggle.append(favLabel)

  const errorText = h("p", { class: "error-text", role: "alert", hidden: true })
  const saveButton = h("button", { type: "submit", class: "btn" }, "Salvar link")

  const submit = async (e) => {
    e?.preventDefault()
    const pending = cleanTag(tagInput.value)
    if (pending && !form.tags.includes(pending)) form.tags.push(pending)

    const fail = (message) => {
      errorText.textContent = message
      errorText.hidden = false
    }
    if (!form.title.trim()) return fail("Informe um título")
    if (!form.category) return fail("Escolha uma categoria")

    saveButton.disabled = true
    saveButton.replaceChildren(h("div", { class: "spinner", style: "width:14px;height:14px" }), "Salvando...")
    try {
      await api("/links", {
        method: "POST",
        body: {
          url: page.url,
          title: form.title,
          description: form.description,
          category: form.category,
          tags: form.tags,
          favicon: isSavableUrl(page.favicon) ? page.favicon : undefined,
          favorite: form.favorite,
        },
      })
      await setConfig({ lastCategory: form.category })
      renderSaved()
    } catch (error) {
      if (error instanceof ApiError && error.message === "UNAUTHORIZED") return renderSetup("Sua conexão expirou.")
      fail(error.message === "OFFLINE" ? "Não foi possível conectar ao Stash" : error.message)
      saveButton.disabled = false
      saveButton.replaceChildren("Salvar link")
    }
  }

  const formEl = h(
    "form",
    {
      class: "form",
      onSubmit: submit,
      onKeydown: (e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(e)
      },
    },
    h(
      "div",
      { class: "page" },
      favicon(page.url, page.favicon),
      h("div", { class: "page-info" }, titleInput, h("div", { class: "page-domain mono muted" }, getDomain(page.url))),
    ),
    h("div", {}, h("label", { class: "label" }, "Descrição"), description),
    h("div", {}, h("span", { class: "label" }, "Categoria"), categoryChips),
    h("div", {}, h("span", { class: "label" }, "Tags"), tagsField, h("div", { style: "margin-top:6px" }, suggestions)),
    errorText,
    h("div", { class: "footer" }, favToggle, saveButton),
    h("div", { class: "hint" }, h("kbd", {}, "⌘"), h("kbd", {}, "Enter"), "para salvar"),
  )

  // Foco inicial: categoria é o único campo obrigatório que não vem preenchido
  requestAnimationFrame(() => (form.category ? tagInput : titleInput).focus())
  return formEl
}

function renderSaved() {
  view.replaceChildren(
    h(
      "div",
      { class: "center" },
      h("div", { class: "empty-icon success" }, icon("check")),
      h("h2", {}, "Salvo no Stash"),
      h("p", {}, state.page.title),
    ),
  )
  setTimeout(() => window.close(), 1100)
}

// ---------------------------------------------------------------------------
// Buscar
// ---------------------------------------------------------------------------

function renderSearch() {
  const input = h("input", { class: "input", type: "search", placeholder: "Buscar nos seus links...", "aria-label": "Buscar" })
  const list = h("div", { class: "results", role: "listbox" })
  const count = h("div", { class: "results-count mono muted" })
  let results = []
  let selected = 0

  const update = () => {
    const terms = normalizeText(input.value).split(/\s+/).filter(Boolean)
    results = state.data.links
      .filter((link) => {
        if (!terms.length) return true
        const haystack = normalizeText(
          [link.title, link.description, link.url, link.category, ...link.tags.map((t) => "#" + t)].join(" "),
        )
        return terms.every((term) => haystack.includes(term))
      })
      .sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.createdAt.localeCompare(a.createdAt))
      .slice(0, 50)
    selected = 0
    draw()
  }

  const draw = () => {
    count.textContent = `${results.length} ${results.length === 1 ? "link" : "links"}`
    if (!results.length) {
      list.replaceChildren(h("div", { class: "center", style: "min-height:120px" }, h("p", {}, "Nenhum link encontrado.")))
      return
    }
    list.replaceChildren(
      ...results.map((link, index) =>
        h(
          "button",
          {
            type: "button",
            class: "result",
            role: "option",
            "aria-selected": String(index === selected),
            title: link.url,
            onClick: () => openUrl(link.url),
            onMouseenter: () => {
              selected = index
              list.querySelectorAll(".result").forEach((el, i) => el.setAttribute("aria-selected", String(i === selected)))
            },
          },
          favicon(link.url, link.favicon),
          h(
            "div",
            { class: "result-body" },
            h("div", { class: "result-title" }, link.favorite ? icon("star") : null, link.title),
            h(
              "div",
              { class: "result-meta" },
              h("span", { class: "cat" }, link.category),
              ` · ${getDomain(link.url)}`,
              link.tags.length ? ` · ${link.tags.map((t) => "#" + t).join(" ")}` : "",
            ),
          ),
        ),
      ),
    )
  }

  input.addEventListener("input", update)
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault()
      selected = Math.max(0, Math.min(results.length - 1, selected + (e.key === "ArrowDown" ? 1 : -1)))
      draw()
      list.children[selected]?.scrollIntoView({ block: "nearest" })
    } else if (e.key === "Enter" && results[selected]) {
      openUrl(results[selected].url)
    }
  })

  update()
  requestAnimationFrame(() => input.focus())
  return h("div", {}, h("div", { class: "search-box" }, icon("search"), input), count, list)
}
