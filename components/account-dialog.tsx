"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"
import { Globe, Loader2, Puzzle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { changePassword, getSessions, revokeSession, updateProfile } from "@/lib/auth"
import type { ActionResult, SessionInfo, User } from "@/lib/types"

interface AccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User
  onUserChange: (user: User) => void
  onUnauthorized: () => void
}

export function AccountDialog({ open, onOpenChange, user, onUserChange, onUnauthorized }: AccountDialogProps) {
  const [tab, setTab] = useState("profile")

  useEffect(() => {
    if (open) setTab("profile")
  }, [open])

  const unwrap = <T,>(result: ActionResult<T>): T | null => {
    if (result.ok) return result.data
    if (result.error === "UNAUTHORIZED") onUnauthorized()
    else toast.error(result.error)
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Minha conta</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="password">Senha</TabsTrigger>
            <TabsTrigger value="sessions">Sessões</TabsTrigger>
          </TabsList>
          <TabsContent value="profile" className="pt-3">
            <ProfileForm user={user} unwrap={unwrap} onSaved={onUserChange} />
          </TabsContent>
          <TabsContent value="password" className="pt-3">
            <PasswordForm unwrap={unwrap} onSaved={() => setTab("profile")} />
          </TabsContent>
          <TabsContent value="sessions" className="pt-3">
            {tab === "sessions" && <SessionsList unwrap={unwrap} />}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

type Unwrap = <T>(result: ActionResult<T>) => T | null

function ProfileForm({ user, unwrap, onSaved }: { user: User; unwrap: Unwrap; onSaved: (user: User) => void }) {
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [saving, setSaving] = useState(false)

  const changed = name.trim() !== user.name || email.trim().toLowerCase() !== user.email

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const updated = unwrap(await updateProfile({ name, email }))
    setSaving(false)
    if (updated) {
      onSaved(updated)
      toast.success("Perfil atualizado")
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field id="account-name" label="Nome">
        <Input id="account-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <Field id="account-email" label="E-mail">
        <Input id="account-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={!changed || saving}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          Salvar
        </Button>
      </div>
    </form>
  )
}

function PasswordForm({ unwrap, onSaved }: { unwrap: Unwrap; onSaved: () => void }) {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (next !== confirm) return setError("As senhas não conferem")
    setSaving(true)
    const result = await changePassword(current, next)
    setSaving(false)
    if (!result.ok) {
      if (result.error === "UNAUTHORIZED") unwrap(result)
      else setError(result.error)
      return
    }
    setCurrent("")
    setNext("")
    setConfirm("")
    toast.success("Senha alterada", { description: "As outras sessões e extensões foram desconectadas." })
    onSaved()
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field id="current-password" label="Senha atual">
        <Input
          id="current-password"
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
          required
        />
      </Field>
      <Field id="new-password" label="Nova senha">
        <Input
          id="new-password"
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          placeholder="Mínimo de 8 caracteres"
          required
        />
      </Field>
      <Field id="confirm-password" label="Confirmar nova senha">
        <Input
          id="confirm-password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
        />
      </Field>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Ao trocar a senha, todas as outras sessões e extensões conectadas são encerradas.
      </p>
      <div className="flex justify-end">
        <Button type="submit" disabled={saving || !current || !next}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          Alterar senha
        </Button>
      </div>
    </form>
  )
}

function SessionsList({ unwrap }: { unwrap: Unwrap }) {
  const [sessions, setSessions] = useState<SessionInfo[] | null>(null)

  useEffect(() => {
    getSessions().then((result) => setSessions(unwrap(result) ?? []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const revoke = async (session: SessionInfo) => {
    if (unwrap(await revokeSession(session.id)) === null) return
    setSessions((current) => current?.filter((s) => s.id !== session.id) ?? null)
    toast.success(session.kind === "api" ? "Extensão desconectada" : "Sessão encerrada")
  }

  if (!sessions) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Navegadores e extensões com acesso à sua conta.</p>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {sessions.map((session) => {
          const Icon = session.kind === "api" ? Puzzle : Globe
          return (
            <li key={session.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                <Icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {session.kind === "api" ? session.label || "Extensão do navegador" : "Navegador"}
                  {session.current && <span className="ml-2 text-xs font-normal text-primary">esta sessão</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  Último uso {formatDistanceToNow(new Date(session.lastUsedAt), { addSuffix: true, locale: ptBR })}
                </p>
              </div>
              {!session.current && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => revoke(session)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  Revogar
                </Button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
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
