import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { SignInCard } from "@/components/sign-in-card"

export default async function SignInPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect("/")

  return (
    <main className="flex min-h-svh w-full items-center justify-center px-4 py-12">
      <SignInCard />
    </main>
  )
}
