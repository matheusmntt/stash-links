import { StashApp } from "@/components/stash-app"
import { LoginScreen } from "@/components/login-screen"
import { listLinks } from "@/lib/db"
import { getLoginScreenProps, getSession } from "@/lib/session"

export const dynamic = "force-dynamic"

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ add?: string; title?: string }>
}) {
  const session = await getSession()

  // Nada de dados é enviado ao navegador sem sessão válida
  if (!session) {
    return <LoginScreen {...await getLoginScreenProps()} />
  }

  const { add, title } = await searchParams

  return (
    <StashApp
      user={session.user}
      initialLinks={await listLinks(session.user.id)}
      sessionExpiresAt={Date.parse(session.expiresAt)}
      prefill={add ? { url: add, title: title ?? "" } : undefined}
    />
  )
}
