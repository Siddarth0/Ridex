"use client"
import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Image from "next/image"
import api, { getApiErrorMessage } from "@/lib/api"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

// useSearchParams requires a Suspense boundary for static prerendering
export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  )
}

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")
  const email = searchParams.get("email")
  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">("idle")
  const [message, setMessage] = useState<string>("")
  const [resending, setResending] = useState(false)

  const header = useMemo(() => {
    if (status === "success") return "Email verified!"
    if (status === "error") return "Verification issue"
    if (status === "verifying") return "Verifying your email"
    return "Verify your email"
  }, [status])

  useEffect(() => {
    if (!token) return
    const run = async () => {
      try {
        setStatus("verifying")
        const res = await api.get(`/auth/verify-email/${token}`)
        setStatus("success")
        setMessage(res.data?.message || "Email verified successfully")
        toast.success("Email verified. Redirecting…")
        setTimeout(() => router.push("/login"), 1500)
      } catch (err) {
        setStatus("error")
        const msg = getApiErrorMessage(err, "Verification failed")
        setMessage(msg)
        toast.error(msg)
      }
    }
    run()
  }, [token, router])

  const handleResend = async () => {
    if (!email) {
      toast.error("Open this page from the link in your email, or register again.")
      return
    }
    try {
      setResending(true)
      await api.post("/auth/resend-verification", { email })
      toast.success("Verification email resent.")
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not resend email"))
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-midnight flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-white/95 backdrop-blur rounded-2xl shadow-xl p-8">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-crimson rounded-xl flex items-center justify-center shadow-lg">
            <Image src="/ridexlogo.png" alt="RideX" width={36} height={36} />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">{header}</h1>
        <p className="text-center text-gray-600 mb-6">
          {status === "idle" && (email ? `We sent a verification link to ${email}.` : "Check your inbox for the verification link.")}
          {status === "verifying" && "Please wait while we confirm your email…"}
          {status !== "verifying" && message}
        </p>

        {!token && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              Didn’t get the email? Check your spam folder or resend a new link below.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                className="bg-crimson hover:bg-crimson-ink"
                onClick={handleResend}
                disabled={resending}
              >
                {resending ? "Resending…" : "Resend verification"}
              </Button>
              <Button variant="secondary" onClick={() => router.push("/login")}>Back to login</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
