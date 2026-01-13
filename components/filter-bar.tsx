"use client"

import { Search, X, Hash } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { CATEGORIES } from "@/lib/types"

interface FilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  selectedCategory: string | null
  onCategoryChange: (category: string | null) => void
  allTags: string[]
  selectedTag: string | null
  onTagChange: (tag: string | null) => void
}

export function FilterBar({
  search,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  allTags,
  selectedTag,
  onTagChange,
}: FilterBarProps) {
  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar links..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-11 h-11 bg-input border-border focus:border-primary"
        />
        {search && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => onSearchChange("")}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Filtros de categoria */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Categorias</span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onCategoryChange(null)}
            className={`px-3 py-1.5 text-sm rounded-md transition-all duration-200 ${
              selectedCategory === null
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            Todas
          </button>
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => onCategoryChange(category)}
              className={`px-3 py-1.5 text-sm rounded-md transition-all duration-200 ${
                selectedCategory === category
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Hash className="w-3 h-3" />
            Tags
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onTagChange(null)}
              className={`px-3 py-1.5 text-sm rounded-md transition-all duration-200 ${
                selectedTag === null
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              Todas
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => onTagChange(tag)}
                className={`px-3 py-1.5 text-sm rounded-md transition-all duration-200 ${
                  selectedTag === tag
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
