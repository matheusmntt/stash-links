import { NextResponse } from "next/server"
import { listLinks } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const date = new Date().toISOString().slice(0, 10)
  const body = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), links: listLinks(user.id) }, null, 2)

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="stash-links-${date}.json"`,
    },
  })
}
