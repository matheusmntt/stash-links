"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowUpDown,
  Check,
  Folder,
  Hash,
  Inbox,
  LayoutGrid,
  List,
  Menu,
  Plus,
  Search,
  SearchX,
  Star,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Sidebar } from "./sidebar"
import { LinkCard, type ViewMode } from "./link-card"
import { LinkDialog, type LinkPrefill } from "./link-dialog"
import { AccountDialog } from "./account-dialog"
import { deleteLink, getLinks, importLinks, registerVisit, restoreLink, toggleFavorite } from "@/lib/actions"
import { logout } from "@/lib/auth"
import { SORT_LABELS, countBy, filterLinks, getCategories, sortLinks } from "@/lib/link-utils"
import { cn } from "@/lib/utils"
import type { ActionResult, Link, SortOption, User } from "@/lib/types"

interface StashAppProps {
  user: User
  initialLinks: Link[]
  sessionExpiresAt: number
  prefill?: LinkPrefill
}

const PREFS_KEY = "stash:prefs"

function readPrefs(): { sort?: SortOption; view?: ViewMode } {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}")
  } catch {
    return {}
  }
}

export function StashApp({ user: initialUser, initialLinks, sessionExpiresAt, prefill }: StashAppProps) {
  const router = useRouter()
  const searchRef = useRef<HTMLInputElement>(null)

  const [user, setUser] = useState(initialUser)
  const [accountOpen, setAccountOpen] = useState(false)
  const [links, setLinks] = useState(initialLinks)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<string | null>(null)
  const [tag, setTag] = useState<string | null>(null)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [sort, setSort] = useState<SortOption>("recent")
  const [view, setView] = useState<ViewMode>("list")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Link | null>(null)
  const [dialogPrefill, setDialogPrefill] = useState<LinkPrefill | undefined>()
  const [menuOpen, setMenuOpen] = useState(false)

  // Preferências locais (ordenação e visualização)
  useEffect(() => {
    const prefs = readPrefs()
    if (prefs.sort && prefs.sort in SORT_LABELS) setSort(prefs.sort)
    if (prefs.view === "grid" || prefs.view === "list") setView(prefs.view)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ sort, view }))
    } catch {}
  }, [sort, view])

  // Volta para a tela de login quando a sessão expira
  useEffect(() => {
    const timeout = Math.min(sessionExpiresAt - Date.now() + 1000, 2 ** 31 - 1)
    const timer = setTimeout(() => router.refresh(), Math.max(timeout, 0))
    return () => clearTimeout(timer)
  }, [sessionExpiresAt, router])

  // Recarrega ao voltar para a aba (links podem ter sido salvos pela extensão)
  useEffect(() => {
    const onVisible = async () => {
      if (document.visibilityState !== "visible") return
      const result = await getLinks()
      if (result.ok) setLinks(result.data)
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [])

  // Vindo do bookmarklet: /?add=<url>&title=<título>
  useEffect(() => {
    if (!prefill) return
    setEditing(null)
    setDialogPrefill(prefill)
    setDialogOpen(true)
    window.history.replaceState(null, "", "/")
  }, [prefill])

  const handleUnauthorized = useCallback(() => {
    toast.error("Sua sessão expirou. Entre novamente.")
    router.refresh()
  }, [router])

  const unwrap = useCallback(
    <T,>(result: ActionResult<T>): T | null => {
      if (result.ok) return result.data
      if (result.error === "UNAUTHORIZED") handleUnauthorized()
      else toast.error(result.error)
      return null
    },
    [handleUnauthorized],
  )

  const openNew = useCallback(() => {
    setEditing(null)
    setDialogPrefill(undefined)
    setDialogOpen(true)
  }, [])

  // Atalhos: "/" busca, "n" novo link, Esc limpa a busca
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const typing = target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)

      if (e.key === "Escape" && target === searchRef.current) {
        setSearch("")
        searchRef.current?.blur()
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        searchRef.current?.focus()
        return
      }
      if (typing || dialogOpen || accountOpen || e.metaKey || e.ctrlKey || e.altKey) return

      if (e.key === "/") {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (e.key.toLowerCase() === "n") {
        e.preventDefault()
        openNew()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [dialogOpen, accountOpen, openNew])

  // ---------------------------------------------------------------------------
  // Dados derivados
  // ---------------------------------------------------------------------------

  const categories = useMemo(() => getCategories(links), [links])

  const categoryCounts = useMemo(() => {
    const counts = countBy(links.map((l) => l.category))
    return categories.filter((c) => counts.has(c)).map((c) => [c, counts.get(c)!] as [string, number])
  }, [links, categories])

  const tagCounts = useMemo(
    () =>
      Array.from(countBy(links.flatMap((l) => l.tags)).entries()).sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
      ),
    [links],
  )

  const allTags = useMemo(() => tagCounts.map(([t]) => t), [tagCounts])
  const favoritesCount = useMemo(() => links.filter((l) => l.favorite).length, [links])

  const visibleLinks = useMemo(
    () => sortLinks(filterLinks(links, { search, category, tag, favoritesOnly }), sort),
    [links, search, category, tag, favoritesOnly, sort],
  )

  const hasFilters = Boolean(search || category || tag || favoritesOnly)

  const clearFilters = () => {
    setSearch("")
    setCategory(null)
    setTag(null)
    setFavoritesOnly(false)
  }

  const heading = favoritesOnly ? "Favoritos" : category ? category : tag ? `#${tag}` : "Todos os links"

  // ---------------------------------------------------------------------------
  // Ações
  // ---------------------------------------------------------------------------

  const replaceLink = (updated: Link) => setLinks((current) => current.map((l) => (l.id === updated.id ? updated : l)))

  const handleSaved = (link: Link, mode: "create" | "update") => {
    if (mode === "create") {
      setLinks((current) => [link, ...current])
      toast.success("Link salvo", { description: link.title })
    } else {
      replaceLink(link)
      toast.success("Link atualizado")
    }
  }

  const handleDelete = async (link: Link) => {
    setLinks((current) => current.filter((l) => l.id !== link.id))
    const removed = unwrap(await deleteLink(link.id))
    if (!removed) {
      setLinks((current) => sortLinks([...current, link], "recent"))
      return
    }

    toast("Link excluído", {
      description: link.title,
      action: {
        label: "Desfazer",
        onClick: async () => {
          const restored = unwrap(await restoreLink(removed))
          if (restored) setLinks((current) => sortLinks([...current, restored], "recent"))
        },
      },
    })
  }

  const handleToggleFavorite = async (link: Link) => {
    replaceLink({ ...link, favorite: !link.favorite })
    const updated = unwrap(await toggleFavorite(link.id, !link.favorite))
    replaceLink(updated ?? link)
  }

  const handleCopy = async (link: Link) => {
    try {
      await navigator.clipboard.writeText(link.url)
      toast.success("URL copiada")
    } catch {
      toast.error("Não foi possível copiar")
    }
  }

  const handleVisit = (link: Link) => {
    replaceLink({ ...link, visits: link.visits + 1, lastVisitedAt: new Date().toISOString() })
    registerVisit(link.id).catch(() => {})
  }

  const handleImport = async (file: File) => {
    let data: unknown
    try {
      data = JSON.parse(await file.text())
    } catch {
      toast.error("Arquivo JSON inválido")
      return
    }
    const result = unwrap(await importLinks(data))
    if (!result) return

    const fresh = unwrap(await getLinks())
    if (fresh) setLinks(fresh)
    toast.success(`${result.imported} link${result.imported === 1 ? "" : "s"} importado${result.imported === 1 ? "" : "s"}`, {
      description: result.skipped ? `${result.skipped} ignorado(s) por já existirem ou serem inválidos` : undefined,
    })
  }

  const handleLogout = async () => {
    await logout()
    router.refresh()
  }

  // ---------------------------------------------------------------------------

  const sidebar = (
    <Sidebar
      total={links.length}
      favorites={favoritesCount}
      categoryCounts={categoryCounts}
      tagCounts={tagCounts}
      category={category}
      tag={tag}
      favoritesOnly={favoritesOnly}
      onSelectAll={() => {
        clearFilters()
        setMenuOpen(false)
      }}
      onSelectFavorites={() => {
        setFavoritesOnly(!favoritesOnly)
        setMenuOpen(false)
      }}
      onSelectCategory={(value) => {
        setCategory(value)
        setMenuOpen(false)
      }}
      onSelectTag={(value) => {
        setTag(value)
        setMenuOpen(false)
      }}
      onImport={handleImport}
      user={user}
      onOpenAccount={() => {
        setMenuOpen(false)
        setAccountOpen(true)
      }}
      onLogout={handleLogout}
    />
  )

  return (
    <div className="min-h-screen">
      {/* Sidebar desktop */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 border-r border-border bg-sidebar">{sidebar}</aside>

      {/* Sidebar mobile */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72 p-0 gap-0">
          <SheetTitle className="sr-only">Navegação</SheetTitle>
          {sidebar}
        </SheetContent>
      </Sheet>

      <div className="lg:pl-64">
        {/* Barra superior */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-lg">
          <div className={cn("mx-auto flex items-center gap-2 px-4 sm:px-6 h-16", view === "grid" ? "max-w-5xl" : "max-w-3xl")}>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden shrink-0"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="size-5" />
            </Button>

            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={searchRef}
                type="search"
                placeholder="Buscar links..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 pl-9 pr-10 bg-card [&::-webkit-search-cancel-button]:hidden"
                aria-label="Buscar links"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("")
                    searchRef.current?.focus()
                  }}
                  aria-label="Limpar busca"
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex size-6 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              ) : (
                <Kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex">/</Kbd>
              )}
            </div>

            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0" aria-label="Ordenar">
                      <ArrowUpDown className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Ordenar: {SORT_LABELS[sort]}</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Ordenar por</DropdownMenuLabel>
                {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
                  <DropdownMenuItem key={option} onSelect={() => setSort(option)}>
                    <Check className={cn(sort === option ? "opacity-100" : "opacity-0")} />
                    {SORT_LABELS[option]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 hidden sm:inline-flex"
                  onClick={() => setView(view === "list" ? "grid" : "list")}
                  aria-label={view === "list" ? "Ver em grade" : "Ver em lista"}
                >
                  {view === "list" ? <LayoutGrid className="size-4" /> : <List className="size-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{view === "list" ? "Ver em grade" : "Ver em lista"}</TooltipContent>
            </Tooltip>

            <Button onClick={openNew} className="shrink-0 h-10" aria-label="Novo link">
              <Plus className="size-4" />
              <span className="hidden sm:inline">Novo link</span>
              <Kbd className="hidden md:inline-flex bg-primary-foreground/15 text-primary-foreground">N</Kbd>
            </Button>
          </div>
        </header>

        <main className={cn("mx-auto px-4 sm:px-6 py-8", view === "grid" ? "max-w-5xl" : "max-w-3xl")}>
          {links.length > 0 && (
            <div className="mb-6">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-2xl font-bold tracking-tight truncate">{heading}</h2>
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider shrink-0">
                  {visibleLinks.length} {visibleLinks.length === 1 ? "link" : "links"}
                </span>
              </div>

              {hasFilters && (
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {favoritesOnly && (
                    <FilterChip icon={<Star />} label="Favoritos" onRemove={() => setFavoritesOnly(false)} />
                  )}
                  {category && <FilterChip icon={<Folder />} label={category} onRemove={() => setCategory(null)} />}
                  {tag && <FilterChip icon={<Hash />} label={tag} onRemove={() => setTag(null)} />}
                  {search && <FilterChip icon={<Search />} label={`"${search}"`} onRemove={() => setSearch("")} />}
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                  >
                    Limpar filtros
                  </button>
                </div>
              )}
            </div>
          )}

          {links.length === 0 ? (
            <Empty className="border border-border mt-8">
              <EmptyHeader>
                <EmptyMedia variant="icon" className="size-12 rounded-xl bg-primary/10 text-primary">
                  <Inbox />
                </EmptyMedia>
                <EmptyTitle>Seu stash está vazio</EmptyTitle>
                <EmptyDescription>
                  Guarde documentações, ferramentas e posts para encontrar tudo depois. Você também pode importar um
                  JSON pela barra lateral.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={openNew}>
                  <Plus className="size-4" /> Adicionar primeiro link
                </Button>
              </EmptyContent>
            </Empty>
          ) : visibleLinks.length === 0 ? (
            <Empty className="mt-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchX />
                </EmptyMedia>
                <EmptyTitle>Nada encontrado</EmptyTitle>
                <EmptyDescription>Nenhum link corresponde aos filtros atuais.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button variant="outline" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <div className={cn("grid gap-3", view === "grid" && "sm:grid-cols-2")}>
              {visibleLinks.map((link) => (
                <LinkCard
                  key={link.id}
                  link={link}
                  view={view}
                  activeTag={tag}
                  onEdit={(l) => {
                    setEditing(l)
                    setDialogPrefill(undefined)
                    setDialogOpen(true)
                  }}
                  onDelete={handleDelete}
                  onToggleFavorite={handleToggleFavorite}
                  onCopy={handleCopy}
                  onVisit={handleVisit}
                  onTagClick={(t) => setTag(tag === t ? null : t)}
                  onCategoryClick={(c) => setCategory(category === c ? null : c)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      <LinkDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        link={editing}
        prefill={dialogPrefill}
        categories={categories}
        allTags={allTags}
        onSaved={handleSaved}
        onUnauthorized={handleUnauthorized}
      />

      <AccountDialog
        open={accountOpen}
        onOpenChange={setAccountOpen}
        user={user}
        onUserChange={setUser}
        onUnauthorized={handleUnauthorized}
      />
    </div>
  )
}

function FilterChip({ icon, label, onRemove }: { icon: React.ReactNode; label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card pl-2.5 pr-1 py-0.5 text-xs [&>svg]:size-3 [&>svg]:text-muted-foreground">
      {icon}
      <span className="max-w-48 truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remover filtro ${label}`}
        className="flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <X className="size-3" />
      </button>
    </span>
  )
}
