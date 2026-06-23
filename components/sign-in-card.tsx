"use client"

import { useState } from "react"
import { CalendarDays, GraduationCap, ClipboardList } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  )
}

export function SignInCard() {
  const [loading, setLoading] = useState(false)

  async function handleGoogle() {
    setLoading(true)
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
    })
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl text-balance">Mi semestre</CardTitle>
        <CardDescription className="text-pretty">
          Inicia sesión con Google para acceder a tu horario, notas y exámenes desde cualquier dispositivo.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
          <li className="flex items-center gap-3">
            <CalendarDays className="size-4 text-foreground" />
            Tu horario de clases siempre a mano
          </li>
          <li className="flex items-center gap-3">
            <GraduationCap className="size-4 text-foreground" />
            Seguimiento de notas y cálculo del final
          </li>
          <li className="flex items-center gap-3">
            <ClipboardList className="size-4 text-foreground" />
            Fechas de exámenes sincronizadas
          </li>
        </ul>

        <Button onClick={handleGoogle} disabled={loading} className="w-full gap-2" size="lg">
          <GoogleIcon />
          {loading ? "Conectando..." : "Continuar con Google"}
        </Button>
      </CardContent>
    </Card>
  )
}
