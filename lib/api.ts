import { NextResponse } from "next/server"

// A API é autenticada por token Bearer (sem cookies), então liberar a origem é seguro
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: CORS_HEADERS })
}

export function preflight() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export function unauthorized() {
  return json({ error: "Não autorizado" }, 401)
}
