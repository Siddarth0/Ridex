"use client"
import { useState } from "react"
import Link from "next/link"
import { useFormik } from "formik"
import * as Yup from "yup"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Mail } from "lucide-react"
import { toast } from "sonner"
import SimpleAuthPage from "@/components/simple-auth-page"

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const validationSchema = Yup.object({
    email: Yup.string().email("Invalid email address").required("Email is required"),
  })

  const formik = useFormik({
    initialValues: {
      email: "",
    },
    validationSchema,
    onSubmit: async (values) => {
      setLoading(true)
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 2000))
        setEmailSent(true)
        toast.success("Password reset email sent!")
      } catch (error) {
        toast.error("Failed to send reset email")
      } finally {
        setLoading(false)
      }
    },
  })

  if (emailSent) {
    return (
      <SimpleAuthPage title="Check Your Email" description="We've sent a password reset link to your email address">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <Mail className="w-8 h-8 text-emerald-600" />
          </div>
          <p className="text-gray-600">
            Click the link in the email to reset your password. If you don't see it, check your spam folder.
          </p>
          <div className="space-y-3">
            <Button onClick={() => setEmailSent(false)} variant="outline" className="w-full">
              Try Different Email
            </Button>
            <Link href="/login">
              <Button variant="ghost" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </Link>
          </div>
        </div>
      </SimpleAuthPage>
    )
  }

  return (
    <SimpleAuthPage
      title="Forgot Password?"
      description="Enter your email address and we'll send you a link to reset your password"
    >
      <form onSubmit={formik.handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            className="h-12"
            {...formik.getFieldProps("email")}
          />
          {formik.touched.email && formik.errors.email && <p className="text-red-500 text-sm">{formik.errors.email}</p>}
        </div>

        <Button type="submit" className="w-full h-12 bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
          {loading ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Sending...</span>
            </div>
          ) : (
            "Send Reset Link"
          )}
        </Button>
      </form>

      <div className="text-center pt-4 border-t border-gray-100">
        <Link href="/login" className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
          <ArrowLeft className="w-4 h-4 inline mr-2" />
          Back to Login
        </Link>
      </div>
    </SimpleAuthPage>
  )
}
