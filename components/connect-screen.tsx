"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeftRight, Bookmark, Check, Loader2, Puzzle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { authorizeExtension, logout } from "@/lib/auth"
import type { User } from "@/lib/types"

interface ConnectScreenProps {
  user: User
  valid: boolean
  redirect: string
  state: string
  label: string
}

export function ConnectScreen({ user, valid, redirect, state, label }: ConnectScreenProps) {
  const router = useRouter()
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle")
  const [error, setError] = useState("")

  const authorize = async () => {
    setStatus("loading")
    setError("")
    const result = await authorizeExtension({ redirect, state, label })
    if (!result.ok) {
      setStatus("idle")
      setError(result.error === "UNAUTHORIZED" ? "Sua sessão expirou. Recarregue a página." : result.error)
      return
    }
    setStatus("done")
    window.location.href = result.data.redirectUrl
  }

  const cancel = () => {
    window.location.href = `${redirect}#${new URLSearchParams({ error: "access_denied", state })}`
  }

  const switchAccount = async () => {
    await logout()
    router.refresh()
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center px-6 py-12 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-120 w-120 rounded-full bg-primary/15 blur-3xl"
      />

      <div className="relative w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-secondary ring-1 ring-border">
            <Puzzle className="size-6 text-muted-foreground" />
          </div>
          <ArrowLeftRight className="size-4 text-muted-foreground" />
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <Bookmark className="size-6 text-primary" />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-card border border-border shadow-xl">
          {!valid ? (
            <div className="text-center space-y-3">
              <AlertCircle className="size-8 text-destructive mx-auto" />
              <h1 className="text-lg font-semibold">Link de conexão inválido</h1>
              <p className="text-sm text-muted-foreground">
                Abra a extensão do Stash e clique em <strong>Conectar</strong> para começar de novo.
              </p>
              <Button variant="outline" className="w-full" onClick={() => router.push("/")}>
                Ir para o Stash
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="text-center">
                <h1 className="text-lg font-semibold">Conectar a extensão</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {label || "A extensão do navegador"} quer acessar sua conta do Stash.
                </p>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-border bg-background/50 p-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <button
                  type="button"
                  onClick={switchAccount}
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline shrink-0"
                >
                  Trocar
                </button>
              </div>

              <ul className="space-y-2 text-sm">
                {["Ver seus links, categorias e tags", "Salvar novos links na sua conta"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-muted-foreground">
                    <Check className="size-4 text-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}

              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1" onClick={cancel} disabled={status !== "idle"}>
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={authorize} disabled={status !== "idle"}>
                  {status !== "idle" && <Loader2 className="size-4 animate-spin" />}
                  {status === "done" ? "Conectando..." : "Autorizar"}
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Você pode desconectar a qualquer momento em Minha conta → Sessões.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
