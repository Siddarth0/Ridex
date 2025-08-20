"use client"
import Image from "next/image"
import Link from "next/link"
import { useFormik } from "formik"
import * as Yup from "yup"
import { useState } from "react"
import axios from "axios"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Car, Eye, EyeOff, ArrowRight, BarChart3, DollarSign, Clock } from "lucide-react"

export default function DriverLoginPage() {
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const validationSchema = Yup.object({
    email: Yup.string().email("Invalid email address").required("Email is required"),
    password: Yup.string().required("Password is required"),
  })

  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setLoading(true)
      try {
        const res = await axios.post("http://localhost:8000/driver/login", values)
        localStorage.setItem("driverToken", res.data.token)
        toast.success("✅ Welcome back! Redirecting to driver dashboard...")
        setTimeout(() => {
          window.location.href = "/driver/dashboard"
        }, 1000)
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Invalid credentials")
      } finally {
        setSubmitting(false)
        setLoading(false)
      }
    },
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        {/* Left Side - Driver Dashboard Preview */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-20 w-32 h-32 bg-white rounded-full"></div>
            <div className="absolute top-40 right-32 w-24 h-24 bg-white rounded-full"></div>
            <div className="absolute bottom-32 left-32 w-40 h-40 bg-white rounded-full"></div>
            <div className="absolute bottom-20 right-20 w-28 h-28 bg-white rounded-full"></div>
          </div>

          <div className="relative z-10 flex flex-col justify-center px-12 py-16 text-white">
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-1">
                  <Image
                    src="/ridexlogo.png"
                    alt="RideX Logo"
                    width={40}
                    height={40}
                    className="object-contain"
                    priority
                  />
                </div>
                <h1 className="text-3xl font-bold">RideX Driver</h1>
              </div>
              <p className="text-emerald-100 text-lg">Welcome back, driver</p>
            </div>

            <div className="mb-12">
              <h2 className="text-4xl font-bold mb-6 leading-tight">
                Ready to
                <span className="block text-emerald-200">Start Earning?</span>
              </h2>
              <p className="text-xl text-emerald-100 mb-8 leading-relaxed">
                Sign in to access your driver dashboard, track your earnings, and start accepting rides.
              </p>
            </div>

            <div className="space-y-6">
              {[
                {
                  icon: <BarChart3 className="w-5 h-5" />,
                  title: "Track Earnings",
                  description: "Real-time earnings tracking and detailed analytics",
                },
                {
                  icon: <Clock className="w-5 h-5" />,
                  title: "Flexible Hours",
                  description: "Go online/offline anytime you want",
                },
                {
                  icon: <DollarSign className="w-5 h-5" />,
                  title: "Weekly Payouts",
                  description: "Get paid every week, directly to your account",
                },
              ].map((feature, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">{feature.title}</h3>
                    <p className="text-emerald-100 text-sm">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 bg-emerald-500/20 rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-4">Today's Opportunities</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-100">Peak hours active</span>
                  <Badge className="bg-yellow-500 text-yellow-900">High Demand</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-emerald-100">Surge multiplier</span>
                  <span className="font-bold">1.8x</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-emerald-100">Estimated hourly</span>
                  <span className="font-bold">$32-45</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md space-y-8">
            <div className="lg:hidden text-center">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="w-16 h-16 bg-emerald-600 rounded-xl flex items-center justify-center p-2 shadow-lg">
                  <Image
                    src="/ridexlogo.png"
                    alt="RideX Logo"
                    width={48}
                    height={48}
                    className="object-contain"
                    priority
                  />
                </div>
                <h1 className="text-3xl font-bold text-gray-900">RideX Driver</h1>
              </div>
              <p className="text-gray-600">Welcome back, driver</p>
            </div>

            <div className="space-y-6">
              <div className="text-center pb-6">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Car className="w-8 h-8 text-white" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Driver Sign In</h2>
                <p className="text-gray-600">Access your driver dashboard and start earning</p>
              </div>

              <form onSubmit={formik.handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="driver@example.com"
                    className="h-12"
                    {...formik.getFieldProps("email")}
                  />
                  {formik.touched.email && formik.errors.email && (
                    <p className="text-red-500 text-xs">{formik.errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link href="/driver/forgot-password" className="text-sm text-emerald-600 hover:text-emerald-700">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="h-12 pr-12"
                      {...formik.getFieldProps("password")}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {formik.touched.password && formik.errors.password && (
                    <p className="text-red-500 text-xs">{formik.errors.password}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="remember" className="w-4 h-4 text-emerald-600 border-gray-300 rounded" />
                  <Label htmlFor="remember" className="text-sm text-gray-600">
                    Keep me signed in
                  </Label>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                  disabled={formik.isSubmitting || loading}
                >
                  {formik.isSubmitting || loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>Sign In to Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </Button>
              </form>

              <div className="text-center pt-4 border-t border-gray-100">
                <p className="text-gray-600">
                  New to RideX?{" "}
                  <Link href="/driver/register" className="text-emerald-600 hover:text-emerald-700 font-medium">
                    Apply to drive
                  </Link>
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-4">Driver benefits</p>
                  <div className="flex items-center justify-center space-x-4">
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      85% Earnings
                    </Badge>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      Weekly Pay
                    </Badge>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                      24/7 Support
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
