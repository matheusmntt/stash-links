"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { useTheme } from "next-themes"
import {
  Bookmark,
  BookmarkPlus,
  ChevronDown,
  Download,
  Folder,
  Hash,
  Layers,
  LogOut,
  Monitor,
  Moon,
  Star,
  Sun,
  Upload,
  UserRound,
  ChevronsUpDown,
  Puzzle,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { User } from "@/lib/types"

const TAGS_PREVIEW = 12

interface SidebarProps {
  total: number
  favorites: number
  categoryCounts: [string, number][]
  tagCounts: [string, number][]
  category: string | null
  tag: string | null
  favoritesOnly: boolean
  onSelectAll: () => void
  onSelectFavorites: () => void
  onSelectCategory: (category: string | null) => void
  onSelectTag: (tag: string | null) => void
  onImport: (file: File) => void
  user: User
  onOpenAccount: () => void
  onLogout: () => void
}

export function Sidebar({
  total,
  favorites,
  categoryCounts,
  tagCounts,
  category,
  tag,
  favoritesOnly,
  onSelectAll,
  onSelectFavorites,
  onSelectCategory,
  onSelectTag,
  onImport,
  user,
  onOpenAccount,
  onLogout,
}: SidebarProps) {
  const [showAllTags, setShowAllTags] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const visibleTags = showAllTags ? tagCounts : tagCounts.slice(0, TAGS_PREVIEW)

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <Bookmark className="size-4.5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-none">Stash</h1>
            <p className="text-xs text-muted-foreground mt-1">Link Manager</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-6">
        <div className="space-y-0.5">
          <NavItem
            icon={<Layers />}
            label="Todos os links"
            count={total}
            active={!favoritesOnly && !category && !tag}
            onClick={onSelectAll}
          />
          <NavItem icon={<Star />} label="Favoritos" count={favorites} active={favoritesOnly} onClick={onSelectFavorites} />
        </div>

        {categoryCounts.length > 0 && (
          <Section title="Categorias">
            {categoryCounts.map(([name, count]) => (
              <NavItem
                key={name}
                icon={<Folder />}
                label={name}
                count={count}
                active={category === name}
                onClick={() => onSelectCategory(category === name ? null : name)}
              />
            ))}
          </Section>
        )}

        {tagCounts.length > 0 && (
          <Section title="Tags">
            <div className="flex flex-wrap gap-1.5 px-2">
              {visibleTags.map(([name, count]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => onSelectTag(tag === name ? null : name)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                    tag === name
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-primary/15 hover:text-primary",
                  )}
                >
                  <Hash className="size-3 opacity-60" />
                  {name}
                  <span className="opacity-60 tabular-nums">{count}</span>
                </button>
              ))}
            </div>
            {tagCounts.length > TAGS_PREVIEW && (
              <button
                type="button"
                onClick={() => setShowAllTags(!showAllTags)}
                className="flex items-center gap-1 px-2 mt-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <ChevronDown className={cn("size-3 transition-transform", showAllTags && "rotate-180")} />
                {showAllTags ? "Mostrar menos" : `Ver todas (${tagCounts.length})`}
              </button>
            )}
          </Section>
        )}
      </nav>

      <div className="border-t border-border px-3 py-3 space-y-0.5">
        <FooterButton icon={<Puzzle />} label="Instalar extensão" href="/extensao" />
        <Bookmarklet />
        <FooterButton icon={<Upload />} label="Importar JSON" onClick={() => fileInput.current?.click()} />
        <FooterButton icon={<Download />} label="Exportar JSON" href="/api/export" />
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onImport(file)
            e.target.value = ""
          }}
        />
        <div className="flex items-center justify-between pt-2 pb-1 px-2">
          <span className="text-xs text-muted-foreground">Tema</span>
          <ThemeSwitcher />
        </div>
        <UserMenu user={user} onOpenAccount={onOpenAccount} onLogout={onLogout} />
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">{title}</h2>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

function NavItem({
  icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors [&_svg]:size-4 [&_svg]:shrink-0",
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      {icon}
      <span className="flex-1 truncate text-left">{label}</span>
      <span className="text-xs tabular-nums opacity-70">{count}</span>
    </button>
  )
}

function FooterButton({
  icon,
  label,
  onClick,
  href,
}: {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  href?: string
}) {
  const className =
    "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors [&_svg]:size-4"
  return href ? (
    <a href={href} className={className}>
      {icon}
      {label}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {icon}
      {label}
    </button>
  )
}

/** Favorito do navegador que abre o Stash com a página atual pré-preenchida. */
function Bookmarklet() {
  const ref = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    // React bloqueia "javascript:" em href, então o atributo é definido direto no DOM
    const code = `javascript:(()=>{window.open('${window.location.origin}/?add='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title),'_blank')})()`
    ref.current?.setAttribute("href", code)
  }, [])

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          ref={ref}
          onClick={(e) => e.preventDefault()}
          draggable
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-grab [&_svg]:size-4"
        >
          <BookmarkPlus />
          Salvar no Stash
        </a>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-56">
        Arraste para a barra de favoritos do navegador para salvar qualquer página com um clique
      </TooltipContent>
    </Tooltip>
  )
}

function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const options = [
    { value: "light", icon: Sun, label: "Claro" },
    { value: "dark", icon: Moon, label: "Escuro" },
    { value: "system", icon: Monitor, label: "Sistema" },
  ]

  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-secondary p-0.5" role="radiogroup" aria-label="Tema">
      {options.map(({ value, icon: Icon, label }) => (
        <Tooltip key={value}>
          <TooltipTrigger asChild>
            <button
              type="button"
              role="radio"
              aria-checked={mounted && theme === value}
              aria-label={label}
              onClick={() => setTheme(value)}
              className={cn(
                "flex size-7 items-center justify-center rounded-md transition-colors",
                mounted && theme === value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}

function UserMenu({ user, onOpenAccount, onLogout }: { user: User; onOpenAccount: () => void; onLogout: () => void }) {
  const initials = user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="mt-2 flex w-full items-center gap-2.5 rounded-lg border border-border px-2 py-2 text-left hover:bg-secondary transition-colors data-[state=open]:bg-secondary"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
            {initials || "?"}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{user.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-(--radix-dropdown-menu-trigger-width)">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground truncate">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onOpenAccount}>
          <UserRound /> Minha conta
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={onLogout}>
          <LogOut /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
