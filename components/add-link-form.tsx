"use client"

import type React from "react"

import { useState } from "react"
import { Plus, Link2, X, Hash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CATEGORIES } from "@/lib/types"
import { addLink } from "@/lib/actions"

interface AddLinkFormProps {
  onLinkAdded: () => void
}

export function AddLinkForm({ onLinkAdded }: AddLinkFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [url, setUrl] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<string>("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      const newTag = tagInput.trim().toLowerCase().replace(/^#/, "")
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag])
      }
      setTagInput("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url || !title || !category) return

    setIsLoading(true)
    try {
      await addLink({ url, title, description, category, tags })
      setUrl("")
      setTitle("")
      setDescription("")
      setCategory("")
      setTags([])
      setIsOpen(false)
      onLinkAdded()
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full group flex items-center gap-3 p-4 border border-dashed border-border rounded-lg hover:border-primary/50 hover:bg-card/50 transition-all duration-300"
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
          <Plus className="w-5 h-5" />
        </div>
        <span className="text-muted-foreground group-hover:text-foreground transition-colors">Adicionar novo link</span>
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 space-y-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
          <Link2 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Novo Link</h3>
          <p className="text-xs text-muted-foreground">Preencha os detalhes abaixo</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">URL</label>
          <Input
            placeholder="https://exemplo.com"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            className="h-11 bg-input border-border focus:border-primary"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Título</label>
          <Input
            placeholder="Nome do link"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="h-11 bg-input border-border focus:border-primary"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Descrição</label>
          <Textarea
            placeholder="Uma breve descrição (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="resize-none min-h-[80px] bg-input border-border focus:border-primary"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Categoria</label>
          <Select value={category} onValueChange={setCategory} required>
            <SelectTrigger className="h-11 bg-input border-border">
              <SelectValue placeholder="Selecione uma categoria" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tags</label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Digite uma tag e pressione Enter"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              className="h-11 pl-9 bg-input border-border focus:border-primary"
            />
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary rounded-md"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-destructive transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 pt-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setIsOpen(false)}
          className="flex-1 h-11 text-muted-foreground hover:text-foreground"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="flex-1 h-11 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isLoading ? "Salvando..." : "Salvar Link"}
        </Button>
      </div>
    </form>
  )
}
