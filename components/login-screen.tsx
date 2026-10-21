"use client"

import type React from "react"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, AlertCircle, Loader2, Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { login, signup } from "@/lib/auth"

interface LoginScreenProps {
  /** Nenhuma conta existe ainda: a tela vira o cadastro da primeira conta */
  firstUser: boolean
  signupAllowed: boolean
  /** Texto abaixo do logo, ex.: "Entre para conectar a extensão" */
  message?: string
}

export function LoginScreen({ firstUser, signupAllowed, message }: LoginScreenProps) {
  const router = useRouter()
  const [mode, setMode] = useState<"login" | "signup">(firstUser ? "signup" : "login")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [isRefreshing, startTransition] = useTransition()

  const isSignup = mode === "signup"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = isSignup ? await signup({ name, email, password }) : await login(email, password)

      if (result.success) {
        startTransition(() => router.refresh())
      } else {
        setError(result.error || "Não foi possível continuar")
        if (!isSignup) setPassword("")
      }
    } catch {
      setError("Erro ao conectar com o servidor")
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setMode(isSignup ? "login" : "signup")
    setError("")
  }

  const busy = loading || isRefreshing

  return (
    <main className="relative min-h-screen flex items-center justify-center px-6 py-12 overflow-hidden">
      {/* Brilho decorativo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-120 w-120 rounded-full bg-primary/15 blur-3xl"
      />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 ring-1 ring-primary/20 mb-5">
            <Bookmark className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Stash</h1>
          <p className="text-muted-foreground text-sm mt-1.5">
            {firstUser
              ? "Crie a primeira conta para começar"
              : message || "Seus links, documentações e ferramentas em um só lugar"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-card border border-border shadow-xl space-y-4">
          <h2 className="font-semibold">{isSignup ? "Criar conta" : "Entrar"}</h2>

          {isSignup && (
            <Field id="name" label="Nome">
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11"
                autoComplete="name"
                autoFocus
                required
                disabled={busy}
              />
            </Field>
          )}

          <Field id="email" label="E-mail">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              className="h-11"
              autoComplete="email"
              autoFocus={!isSignup}
              required
              disabled={busy}
            />
          </Field>

          <Field id="password" label="Senha">
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignup ? "Mínimo de 8 caracteres" : "••••••••"}
                className="h-11 pr-10"
                autoComplete={isSignup ? "new-password" : "current-password"}
                minLength={isSignup ? 8 : undefined}
                required
                disabled={busy}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>

          {error && (
            <div role="alert" className="flex items-start gap-2 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" className="w-full h-11" disabled={busy || !email || !password}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {busy ? "Aguarde..." : isSignup ? "Criar conta" : "Entrar"}
          </Button>
        </form>

        {signupAllowed && !firstUser && (
          <p className="text-center text-sm text-muted-foreground mt-6">
            {isSignup ? "Já tem uma conta?" : "Ainda não tem conta?"}{" "}
            <button type="button" onClick={switchMode} className="text-primary font-medium hover:underline">
              {isSignup ? "Entrar" : "Criar conta"}
            </button>
          </p>
        )}
      </div>
    </main>
  )
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  )
}
