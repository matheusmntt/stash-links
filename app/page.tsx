import { StashApp } from "@/components/stash-app"
import { LoginScreen } from "@/components/login-screen"
import { listLinks } from "@/lib/db"
import { getSession, isSignupAllowed } from "@/lib/session"
import { countUsers } from "@/lib/users"

export const dynamic = "force-dynamic"

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ add?: string; title?: string }>
}) {
  const session = await getSession()

  // Nada de dados é enviado ao navegador sem sessão válida
  if (!session) {
    return <LoginScreen firstUser={countUsers() === 0} signupAllowed={isSignupAllowed()} />
  }

  const { add, title } = await searchParams

  return (
    <StashApp
      user={session.user}
      initialLinks={listLinks(session.user.id)}
      sessionExpiresAt={Date.parse(session.expiresAt)}
      prefill={add ? { url: add, title: title ?? "" } : undefined}
    />
  )
}
