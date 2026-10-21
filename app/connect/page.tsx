import type { Metadata } from "next"
import { ConnectScreen } from "@/components/connect-screen"
import { LoginScreen } from "@/components/login-screen"
import { getLoginScreenProps, getSession, isExtensionRedirect } from "@/lib/session"

export const dynamic = "force-dynamic"

export const metadata: Metadata = { title: "Conectar extensão · Stash" }

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; state?: string; label?: string }>
}) {
  const { redirect = "", state = "", label = "" } = await searchParams
  const valid = isExtensionRedirect(redirect) && /^[A-Za-z0-9_-]{16,128}$/.test(state)

  const session = await getSession()
  if (!session) {
    return (
      <LoginScreen {...await getLoginScreenProps()} message="Entre na sua conta para conectar a extensão do navegador" />
    )
  }

  return <ConnectScreen user={session.user} valid={valid} redirect={redirect} state={state} label={label.slice(0, 80)} />
}
