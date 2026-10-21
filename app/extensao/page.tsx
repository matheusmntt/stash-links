import type { Metadata } from "next"
import { ExtensionPage } from "@/components/extension-page"
import { LoginScreen } from "@/components/login-screen"
import { getSession, isSignupAllowed } from "@/lib/session"
import { countUsers, listSessions } from "@/lib/users"

export const dynamic = "force-dynamic"

export const metadata: Metadata = { title: "Extensão do navegador · Stash" }

export default async function ExtensionRoute() {
  const session = await getSession()
  if (!session) {
    return <LoginScreen firstUser={countUsers() === 0} signupAllowed={isSignupAllowed()} />
  }

  const connected = listSessions(session.user.id).filter((s) => s.kind === "api")
  return <ExtensionPage connected={connected} />
}
