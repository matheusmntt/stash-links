"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { LoginScreen } from "./login-screen"
import { checkAuth, logout } from "@/lib/auth"

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [expiresAt, setExpiresAt] = useState<number | null>(null)

  const verifyAuth = useCallback(async () => {
    const result = await checkAuth()
    setAuthenticated(result.authenticated)
    if (result.expiresAt) {
      setExpiresAt(result.expiresAt)
    }
  }, [])

  useEffect(() => {
    verifyAuth()
  }, [verifyAuth])

  useEffect(() => {
    if (!expiresAt) return

    const checkExpiration = () => {
      if (Date.now() > expiresAt) {
        setAuthenticated(false)
        setExpiresAt(null)
        logout()
      }
    }

    const interval = setInterval(checkExpiration, 1000)

    return () => clearInterval(interval)
  }, [expiresAt])

  return (
    <div className="relative">
      {/* Conteúdo sempre renderizado */}
      <div className={authenticated === false ? "pointer-events-none select-none" : ""}>{children}</div>

      {/* Loading overlay */}
      {authenticated === null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Login overlay com blur */}
      {authenticated === false && (
        <LoginScreen
          onSuccess={() => {
            setAuthenticated(true)
            setExpiresAt(Date.now() + 5 * 60 * 1000)
          }}
        />
      )}
    </div>
  )
}
