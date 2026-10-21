"use client"

import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Copy, ExternalLink, MoreHorizontal, Pencil, Star, Trash2, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Favicon } from "./favicon"
import { getDomain } from "@/lib/link-utils"
import { cn } from "@/lib/utils"
import type { Link } from "@/lib/types"

export type ViewMode = "list" | "grid"

interface LinkCardProps {
  link: Link
  view: ViewMode
  activeTag: string | null
  onEdit: (link: Link) => void
  onDelete: (link: Link) => void
  onToggleFavorite: (link: Link) => void
  onCopy: (link: Link) => void
  onVisit: (link: Link) => void
  onTagClick: (tag: string) => void
  onCategoryClick: (category: string) => void
}

export function LinkCard({
  link,
  view,
  activeTag,
  onEdit,
  onDelete,
  onToggleFavorite,
  onCopy,
  onVisit,
  onTagClick,
  onCategoryClick,
}: LinkCardProps) {
  const createdAt = new Date(link.createdAt)

  return (
    <article
      className={cn(
        "group relative flex gap-4 rounded-xl border border-border bg-card p-4 sm:p-5 transition-all duration-200",
        "hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 focus-within:border-primary/40",
        view === "grid" && "flex-col",
      )}
    >
      <Favicon url={link.url} src={link.favicon} />

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 pr-16">
          <h3 className="font-semibold leading-snug text-foreground group-hover:text-primary transition-colors min-w-0">
            {/* Link "esticado": o card inteiro é clicável, os botões ficam acima dele */}
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onVisit(link)}
              onAuxClick={(e) => e.button === 1 && onVisit(link)}
              className="outline-none after:absolute after:inset-0 after:rounded-xl after:content-[''] wrap-break-word"
            >
              {link.title}
            </a>
            <ExternalLink className="hidden md:inline-block ml-1.5 -mt-0.5 size-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </h3>
        </div>

        <p className="text-xs font-mono text-muted-foreground mt-1 truncate">{getDomain(link.url)}</p>

        {link.description && (
          <p className={cn("text-sm text-muted-foreground mt-2.5 leading-relaxed", view === "grid" ? "line-clamp-3" : "line-clamp-2")}>
            {link.description}
          </p>
        )}

        <div className="relative z-10 flex flex-wrap items-center gap-x-2 gap-y-1.5 mt-3.5 text-xs w-fit">
          <button
            type="button"
            onClick={() => onCategoryClick(link.category)}
            className="font-medium text-primary hover:underline underline-offset-2"
          >
            {link.category}
          </button>
          {link.tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onTagClick(tag)}
              className={cn(
                "px-2 py-0.5 rounded-md font-medium transition-colors",
                activeTag === tag
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-primary/15 hover:text-primary",
              )}
            >
              #{tag}
            </button>
          ))}
          <span className="text-muted-foreground/80 font-mono" title={createdAt.toLocaleString("pt-BR")}>
            · {formatDistanceToNow(createdAt, { addSuffix: true, locale: ptBR })}
          </span>
          {link.visits > 0 && (
            <span className="inline-flex items-center gap-1 text-muted-foreground/80 font-mono" title="Acessos">
              · <Eye className="size-3" />
              {link.visits}
            </span>
          )}
        </div>
      </div>

      {/* Ações */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleFavorite(link)}
              aria-label={link.favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              aria-pressed={link.favorite}
              className={cn(
                "size-8 transition-opacity",
                link.favorite
                  ? "text-favorite hover:text-favorite"
                  : "text-muted-foreground md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100",
              )}
            >
              <Star className={cn("size-4", link.favorite && "fill-current")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{link.favorite ? "Remover dos favoritos" : "Favoritar"}</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Mais ações"
              className="size-8 text-muted-foreground md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem asChild>
              <a href={link.url} target="_blank" rel="noopener noreferrer" onClick={() => onVisit(link)}>
                <ExternalLink /> Abrir
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onCopy(link)}>
              <Copy /> Copiar URL
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onEdit(link)}>
              <Pencil /> Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => onDelete(link)}>
              <Trash2 /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  )
}
