"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { getDomain } from "@/lib/link-utils"

interface FaviconProps {
  url: string
  src?: string
  className?: string
}

export function Favicon({ url, src, className }: FaviconProps) {
  const domain = getDomain(url)
  const candidates = [src, safeOrigin(url) && `${safeOrigin(url)}/favicon.ico`].filter(Boolean) as string[]
  const [index, setIndex] = useState(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setIndex(0)
    setLoaded(false)
  }, [src, url])

  const current = candidates[index]

  return (
    <div
      className={cn(
        "relative flex items-center justify-center shrink-0 rounded-lg bg-secondary ring-1 ring-border overflow-hidden size-10",
        className,
      )}
    >
      {/* A inicial fica por baixo até o ícone carregar, evitando caixa vazia ou ícone quebrado */}
      <span
        className={cn("text-sm font-semibold uppercase text-muted-foreground transition-opacity", loaded && "opacity-0")}
      >
        {domain.charAt(0) || "?"}
      </span>
      {current && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={current}
          // Cobre o caso da imagem carregar antes da hidratação (onLoad não dispara)
          ref={(el) => {
            if (el?.complete && el.naturalWidth > 0) setLoaded(true)
          }}
          src={current}
          alt=""
          className={cn("absolute size-5 object-contain transition-opacity", loaded ? "opacity-100" : "opacity-0")}
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={(e) => setLoaded(e.currentTarget.naturalWidth > 0)}
          onError={() => {
            setLoaded(false)
            setIndex((i) => i + 1)
          }}
        />
      )}
    </div>
  )
}

function safeOrigin(url: string): string | null {
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}
