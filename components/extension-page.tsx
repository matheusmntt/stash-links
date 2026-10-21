"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"
import { ArrowLeft, Check, Copy, Download, MousePointerClick, Puzzle, Search, Keyboard, BookmarkPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import type { SessionInfo } from "@/lib/types"

export function ExtensionPage({ connected }: { connected: SessionInfo[] }) {
  return (
    <main className="min-h-screen px-4 sm:px-6 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" /> Voltar ao Stash
        </Link>

        {/* Destaque */}
        <section className="mt-8 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <Puzzle className="size-8 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">Extensão do navegador</h1>
            <p className="text-muted-foreground mt-1">
              Salve a página que você está vendo com um clique e encontre seus links de qualquer aba.
            </p>
          </div>
          <Button asChild size="lg" className="shrink-0">
            <a href="/api/extension" download>
              <Download className="size-4" /> Baixar extensão
            </a>
          </Button>
        </section>

        <ConnectedStatus connected={connected} />

        {/* Recursos */}
        <section className="mt-8 grid gap-3 sm:grid-cols-2">
          <Feature icon={<BookmarkPlus />} title="Salvar a aba atual">
            Título e descrição já vêm preenchidos; só escolha a categoria e as tags.
          </Feature>
          <Feature icon={<Search />} title="Buscar seus links">
            Encontre e abra qualquer link salvo sem sair da página.
          </Feature>
          <Feature icon={<MousePointerClick />} title="Clique direito">
            &quot;Salvar link no Stash&quot; em qualquer link ou página, sem abrir formulário.
          </Feature>
          <Feature icon={<Keyboard />} title="Atalho de teclado">
            <Kbd>Alt</Kbd> + <Kbd>Shift</Kbd> + <Kbd>S</Kbd> abre a extensão.
          </Feature>
        </section>

        {/* Passo a passo */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Como instalar</h2>
          <p className="text-sm text-muted-foreground mt-1">Chrome, Edge, Brave, Arc e outros navegadores baseados no Chromium.</p>

          <ol className="mt-5 space-y-5">
            <Step n={1} title="Baixe e descompacte">
              Clique em <strong>Baixar extensão</strong> e descompacte o arquivo. Vai aparecer uma pasta{" "}
              <code className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded whitespace-nowrap">stash-extension</code>.
            </Step>
            <Step n={2} title="Abra a página de extensões">
              Cole o endereço abaixo numa nova aba e ative o <strong>Modo do desenvolvedor</strong> no canto superior
              direito.
              <CopyField value="chrome://extensions" />
            </Step>
            <Step n={3} title="Carregue a extensão">
              Clique em <strong>Carregar sem compactação</strong> e selecione a pasta{" "}
              <code className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded whitespace-nowrap">stash-extension</code>. Fixe o ícone
              na barra para ter acesso rápido.
            </Step>
            <Step n={4} title="Autorize o acesso">
              A extensão já vem configurada para este Stash: assim que for instalada, abre uma aba pedindo para você{" "}
              <strong>Autorizar</strong> o acesso à sua conta. Não precisa digitar endereço nem senha.
            </Step>
          </ol>

          <p className="mt-8 text-xs text-muted-foreground">
            Firefox: abra <code className="font-mono">about:debugging#/runtime/this-firefox</code>, clique em{" "}
            <strong>Carregar extensão temporária</strong> e escolha o arquivo <code className="font-mono">manifest.json</code>{" "}
            da pasta.
          </p>
        </section>
      </div>
    </main>
  )
}

function ConnectedStatus({ connected }: { connected: SessionInfo[] }) {
  if (connected.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
        Nenhuma extensão conectada à sua conta ainda.
      </div>
    )
  }

  return (
    <div className="mt-8 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Check className="size-4 text-primary" />
        {connected.length === 1 ? "Extensão conectada" : `Conectada em ${connected.length} navegadores`}
      </p>
      <ul className="mt-1.5 space-y-0.5 pl-6 text-xs text-muted-foreground">
        {connected.map((s) => (
          <li key={s.id}>
            {s.label || "Extensão do navegador"} · usada{" "}
            {formatDistanceToNow(new Date(s.lastUsedAt), { addSuffix: true, locale: ptBR })}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Feature({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 font-medium text-sm [&_svg]:size-4 [&_svg]:text-primary">
        {icon}
        {title}
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground">{children}</p>
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
        {n}
      </span>
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="font-medium">{title}</p>
        <div className="mt-1 text-sm text-muted-foreground leading-relaxed">{children}</div>
      </div>
    </li>
  )
}

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Não foi possível copiar")
    }
  }

  return (
    <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-card pl-3 pr-1 py-1 max-w-md">
      <code className="flex-1 truncate font-mono text-xs text-foreground">{value}</code>
      <Button variant="ghost" size="sm" onClick={copy} className="h-7 shrink-0">
        {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
        {copied ? "Copiado" : "Copiar"}
      </Button>
    </div>
  )
}
