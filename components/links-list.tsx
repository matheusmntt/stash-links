"use client"

import { useState, useEffect, useMemo } from "react"
import { Inbox } from "lucide-react"
import type { Link } from "@/lib/types"
import { getLinks, getAllTags } from "@/lib/actions"
import { AddLinkForm } from "./add-link-form"
import { LinkCard } from "./link-card"
import { FilterBar } from "./filter-bar"

export function LinksList() {
  const [links, setLinks] = useState<Link[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [allTags, setAllTags] = useState<string[]>([])
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  const fetchLinks = async () => {
    setIsLoading(true)
    try {
      const [data, tags] = await Promise.all([getLinks(), getAllTags()])
      setLinks(data)
      setAllTags(tags)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLinks()
  }, [])

  const filteredLinks = useMemo(() => {
    return links.filter((link) => {
      const matchesSearch =
        search === "" ||
        link.title.toLowerCase().includes(search.toLowerCase()) ||
        link.description?.toLowerCase().includes(search.toLowerCase()) ||
        link.url.toLowerCase().includes(search.toLowerCase()) ||
        link.tags?.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))

      const matchesCategory = selectedCategory === null || link.category === selectedCategory

      const matchesTag = selectedTag === null || link.tags?.includes(selectedTag)

      return matchesSearch && matchesCategory && matchesTag
    })
  }, [links, search, selectedCategory, selectedTag])

  const handleTagClick = (tag: string) => {
    setSelectedTag(tag)
  }

  return (
    <div className="space-y-8">
      <AddLinkForm onLinkAdded={fetchLinks} />

      {links.length > 0 && (
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          allTags={allTags}
          selectedTag={selectedTag}
          onTagChange={setSelectedTag}
        />
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : links.length === 0 ? (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary mb-6">
            <Inbox className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum link salvo</h3>
          <p className="text-muted-foreground text-sm">Comece adicionando seu primeiro link acima.</p>
        </div>
      ) : filteredLinks.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Nenhum link encontrado para esta busca.</div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            {filteredLinks.length} link{filteredLinks.length !== 1 && "s"}
            {selectedCategory && ` em ${selectedCategory}`}
            {selectedTag && ` com #${selectedTag}`}
          </p>
          <div className="grid gap-4">
            {filteredLinks.map((link) => (
              <LinkCard key={link.id} link={link} onDeleted={fetchLinks} onTagClick={handleTagClick} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
