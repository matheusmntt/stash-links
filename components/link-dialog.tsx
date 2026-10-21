"use client"

import type React from "react"

import { useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, Hash, Loader2, Sparkles, Star, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Kbd } from "@/components/ui/kbd"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Favicon } from "./favicon"
import { addLink, checkDuplicate, fetchMetadata, updateLink } from "@/lib/actions"
import { normalizeText } from "@/lib/link-utils"
import { cn } from "@/lib/utils"
import type { ActionResult, Link } from "@/lib/types"

export interface LinkPrefill {
  url: string
  title?: string
}

interface LinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  link: Link | null
  prefill?: LinkPrefill
  categories: string[]
  allTags: string[]
  onSaved: (link: Link, mode: "create" | "update") => void
  onUnauthorized: () => void
}

const isValidUrl = (value: string) => {
  try {
    return /^https?:$/.test(new URL(value).protocol)
  } catch {
    return false
  }
}

const cleanTag = (value: string) =>
  value.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, "-").replace(/,/g, "")

export function LinkDialog({
  open,
  onOpenChange,
  link,
  prefill,
  categories,
  allTags,
  onSaved,
  onUnauthorized,
}: LinkDialogProps) {
  const isEditing = Boolean(link)

  const [url, setUrl] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [favicon, setFavicon] = useState<string | undefined>()
  const [favorite, setFavorite] = useState(false)

  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [fetchingMeta, setFetchingMeta] = useState(false)
  const [duplicate, setDuplicate] = useState<Link | null>(null)

  // Guarda o que foi preenchido automaticamente para não sobrescrever o que o usuário digitou
  const autoFilled = useRef({ title: "", description: "" })
  const lastFetchedUrl = useRef("")

  useEffect(() => {
    if (!open) return
    setUrl(link?.url ?? prefill?.url ?? "")
    setTitle(link?.title ?? prefill?.title ?? "")
    setDescription(link?.description ?? "")
    setCategory(link?.category ?? "")
    setTags(link?.tags ?? [])
    setTagInput("")
    setFavicon(link?.favicon)
    setFavorite(link?.favorite ?? false)
    setError("")
    setDuplicate(null)
    autoFilled.current = { title: "", description: "" }
    lastFetchedUrl.current = link?.url ?? ""
  }, [open, link, prefill])

  const handleResult = <T,>(result: ActionResult<T>): T | null => {
    if (result.ok) return result.data
    if (result.error === "UNAUTHORIZED") onUnauthorized()
    return null
  }

  // Ao digitar/colar a URL: busca título, descrição e favicon e verifica duplicados
  useEffect(() => {
    if (!open || !isValidUrl(url.trim())) {
      setDuplicate(null)
      return
    }
    const target = url.trim()
    let cancelled = false

    const timer = setTimeout(async () => {
      const dup = handleResult(await checkDuplicate(target, link?.id))
      if (!cancelled) setDuplicate(dup ?? null)

      if (target === lastFetchedUrl.current) return
      lastFetchedUrl.current = target
      setFetchingMeta(true)
      const meta = handleResult(await fetchMetadata(target))
      if (cancelled) return
      setFetchingMeta(false)
      if (!meta) return

      if (meta.favicon) setFavicon(meta.favicon)
      setTitle((current) => {
        if (meta.title && (!current.trim() || current === autoFilled.current.title)) {
          autoFilled.current.title = meta.title
          return meta.title
        }
        return current
      })
      setDescription((current) => {
        if (meta.description && (!current.trim() || current === autoFilled.current.description)) {
          autoFilled.current.description = meta.description
          return meta.description
        }
        return current
      })
    }, 450)

    return () => {
      cancelled = true
      clearTimeout(timer)
      setFetchingMeta(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, open, link?.id])

  const tagSuggestions = useMemo(() => {
    const query = normalizeText(cleanTag(tagInput))
    return allTags.filter((tag) => !tags.includes(tag) && (!query || normalizeText(tag).includes(query))).slice(0, 8)
  }, [allTags, tags, tagInput])

  const addTag = (value: string) => {
    const tag = cleanTag(value)
    if (tag && !tags.includes(tag)) setTags((current) => [...current, tag])
    setTagInput("")
  }

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === "," || e.key === "Tab") && tagInput.trim()) {
      e.preventDefault()
      addTag(tagInput)
    } else if (e.key === "Backspace" && !tagInput && tags.length) {
      setTags((current) => current.slice(0, -1))
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError("")

    const trimmedUrl = url.trim()
    if (!isValidUrl(trimmedUrl)) return setError("Informe uma URL válida começando com http:// ou https://")
    if (!title.trim()) return setError("Informe um título")
    if (!category) return setError("Escolha uma categoria")
    if (duplicate) return setError(`Esse link já está salvo como "${duplicate.title}"`)

    const pendingTag = cleanTag(tagInput)
    const finalTags = pendingTag && !tags.includes(pendingTag) ? [...tags, pendingTag] : tags

    const payload = { url: trimmedUrl, title, description, category, tags: finalTags, favicon, favorite }

    setSaving(true)
    try {
      const result = link ? await updateLink(link.id, payload) : await addLink(payload)
      if (result.ok) {
        onSaved(result.data, link ? "update" : "create")
        onOpenChange(false)
      } else if (result.error === "UNAUTHORIZED") {
        onUnauthorized()
      } else {
        setError(result.error)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92dvh] overflow-y-auto">
        <form
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit()
          }}
          className="space-y-5"
        >
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar link" : "Novo link"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Atualize as informações do link." : "Cole a URL e o título e a descrição são preenchidos automaticamente."}
            </DialogDescription>
          </DialogHeader>

          {/* URL */}
          <div className="space-y-2">
            <FieldLabel htmlFor="link-url">URL</FieldLabel>
            <div className="flex items-center gap-3">
              <Favicon url={isValidUrl(url) ? url : ""} src={favicon} className="size-10" />
              <div className="relative flex-1">
                <Input
                  id="link-url"
                  placeholder="https://exemplo.com/docs"
                  type="url"
                  inputMode="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  autoFocus={!isEditing}
                  className="h-10 pr-9"
                />
                {fetchingMeta && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
            {duplicate && (
              <p className="flex items-center gap-1.5 text-xs text-favorite">
                <AlertTriangle className="size-3.5 shrink-0" />
                Já salvo como &quot;{duplicate.title}&quot;
              </p>
            )}
          </div>

          {/* Título */}
          <div className="space-y-2">
            <FieldLabel htmlFor="link-title">
              Título
              {title && title === autoFilled.current.title && (
                <span className="inline-flex items-center gap-1 normal-case tracking-normal text-primary font-normal">
                  <Sparkles className="size-3" /> automático
                </span>
              )}
            </FieldLabel>
            <Input
              id="link-title"
              placeholder="Nome do link"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus={isEditing}
              className="h-10"
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <FieldLabel htmlFor="link-description">Descrição</FieldLabel>
            <Textarea
              id="link-description"
              placeholder="Por que vale guardar este link? (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none min-h-20"
            />
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <FieldLabel>Categoria</FieldLabel>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Categoria">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  role="radio"
                  aria-checked={category === cat}
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-lg border transition-colors",
                    category === cat
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40",
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <FieldLabel htmlFor="link-tags">Tags</FieldLabel>
            <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input px-2.5 py-2 min-h-10 focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px] transition-[color,box-shadow]">
              <Hash className="size-4 text-muted-foreground shrink-0" />
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-md"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => setTags(tags.filter((t) => t !== tag))}
                    aria-label={`Remover tag ${tag}`}
                    className="rounded hover:bg-primary/20 p-0.5"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              <input
                id="link-tags"
                placeholder={tags.length ? "" : "react, api, css..."}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => tagInput.trim() && addTag(tagInput)}
                className="flex-1 min-w-24 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            {tagSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tagSuggestions.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addTag(tag)}
                    className="text-xs px-2 py-0.5 rounded-md text-muted-foreground bg-secondary hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setFavorite(!favorite)}
            aria-pressed={favorite}
            className={cn(
              "flex items-center gap-2 text-sm transition-colors",
              favorite ? "text-favorite" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Star className={cn("size-4", favorite && "fill-current")} />
            {favorite ? "Nos favoritos" : "Adicionar aos favoritos"}
          </button>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-2 items-center">
            <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground mr-auto">
              <Kbd>⌘</Kbd>
              <Kbd>Enter</Kbd> para salvar
            </span>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {isEditing ? "Salvar alterações" : "Salvar link"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider"
    >
      {children}
    </label>
  )
}
