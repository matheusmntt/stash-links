import type { Metadata } from "next"
import { ExtensionPage } from "@/components/extension-page"
import { LoginScreen } from "@/components/login-screen"
import { getLoginScreenProps, getSession } from "@/lib/session"
import { listSessions } from "@/lib/users"

export const dynamic = "force-dynamic"

export const metadata: Metadata = { title: "Extensão do navegador · Stash" }

export default async function ExtensionRoute() {
  const session = await getSession()
  if (!session) {
    return <LoginScreen {...await getLoginScreenProps()} />
  }

  const connected = (await listSessions(session.user.id)).filter((s) => s.kind === "api")
  return <ExtensionPage connected={connected} />
}
