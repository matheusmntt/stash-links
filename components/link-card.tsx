"use client"

import { useState } from "react"
import { ExternalLink, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Link } from "@/lib/types"
import { deleteLink } from "@/lib/actions"

interface LinkCardProps {
  link: Link
  onDeleted: () => void
  onTagClick?: (tag: string) => void
}

export function LinkCard({ link, onDeleted, onTagClick }: LinkCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteLink(link.id)
      onDeleted()
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    })
  }

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace("www.", "")
    } catch {
      return url
    }
  }

  return (
    <div className="group relative">
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block p-5 rounded-lg border border-border bg-card hover:bg-secondary/50 hover:border-primary/30 transition-all duration-300"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Data e categoria */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-mono text-muted-foreground">{formatDate(link.createdAt)}</span>
              <span className="text-muted-foreground">—</span>
              <span className="text-xs font-medium text-primary">{link.category}</span>
            </div>

            {/* Título */}
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
              {link.title}
              <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>

            {/* Descrição */}
            {link.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{link.description}</p>}

            {link.tags && link.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {link.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onTagClick?.(tag)
                    }}
                    className="text-xs font-medium text-primary/80 hover:text-primary hover:bg-primary/10 px-2 py-0.5 rounded transition-colors"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}

            {/* Domínio */}
            <p className="text-xs font-mono text-muted-foreground/70 mt-3">{getDomain(link.url)}</p>
          </div>
        </div>
      </a>

      {/* Botão de deletar */}
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.preventDefault()
          handleDelete()
        }}
        disabled={isDeleting}
        className="absolute top-3 right-3 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  )
}
