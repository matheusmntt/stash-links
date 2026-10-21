import fs from "fs"
import path from "path"
import { NextResponse } from "next/server"
import { getAppUrl } from "@/lib/app-url"
import { createZip, listFiles } from "@/lib/zip"

export const dynamic = "force-dynamic"

const EXTENSION_DIR = path.join(process.cwd(), "extension")
const EXCLUDE = new Set(["icons/icon.svg"])

/**
 * Baixa a extensão do navegador como .zip, com uma pasta "stash-extension/" dentro.
 * O config.js é gerado com o endereço deste servidor, então a extensão já vem configurada.
 */
export async function GET(request: Request) {
  const config = [
    "// Gerado pelo Stash no download da extensão",
    `export const SERVER_URL = ${JSON.stringify(getAppUrl(request))}`,
    "export const PRECONFIGURED = true",
    "",
  ].join("\n")

  const files = listFiles(EXTENSION_DIR)
    .filter((name) => !EXCLUDE.has(name))
    .map((name) => ({
      name: `stash-extension/${name}`,
      data: name === "config.js" ? Buffer.from(config) : fs.readFileSync(path.join(EXTENSION_DIR, name)),
    }))

  return new NextResponse(new Uint8Array(createZip(files)), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="stash-extension.zip"',
      "Cache-Control": "no-store",
    },
  })
}
