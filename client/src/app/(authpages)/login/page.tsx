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
import { Car, Eye, EyeOff, ArrowRight, Shield, CheckCircle, Zap, Users, Star } from "lucide-react"

export default function LoginPage() {
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
        const res = await axios.post("http://localhost:8000/login", values)
        localStorage.setItem("token", res.data.token)
        toast.success("✅ Login successful! Redirecting...")
        setTimeout(() => {
          window.location.href = "/dashboard"
        }, 1000)
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Invalid credentials")
      } finally {
        setSubmitting(false)
        setLoading(false)
      }
    },
  })

  const features = [
    {
      icon: <Car className="w-5 h-5" />,
      title: "Quick Rides",
      description: "Get matched with nearby drivers in seconds",
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: "Trusted Network",
      description: "Verified drivers and secure payment system",
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "Safe Journey",
      description: "Real-time tracking and 24/7 support",
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        {/* Left Side - Hero Section */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-20 w-32 h-32 bg-white rounded-full"></div>
            <div className="absolute top-40 right-32 w-24 h-24 bg-white rounded-full"></div>
            <div className="absolute bottom-32 left-32 w-40 h-40 bg-white rounded-full"></div>
            <div className="absolute bottom-20 right-20 w-28 h-28 bg-white rounded-full"></div>
          </div>

          <div className="relative z-10 flex flex-col justify-center px-12 py-16 text-white">
            {/* Logo */}
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
                <h1 className="text-3xl font-bold">RideX</h1>
              </div>
              <p className="text-emerald-100 text-lg">Welcome back to your journey</p>
            </div>

            {/* Main Content */}
            <div className="mb-12">
              <h2 className="text-4xl font-bold mb-6 leading-tight">
                Ready to
                <span className="block text-emerald-200">Hit the Road?</span>
              </h2>
              <p className="text-xl text-emerald-100 mb-8 leading-relaxed">
                Sign in to access your rides, track your trips, and connect with our trusted driver community.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-6">
              {features.map((feature, index) => (
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

            {/* Recent Activity */}
            <div className="mt-12 bg-emerald-500/20 rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-4">Recent Activity</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-100">Active riders today</span>
                  <span className="font-bold">2,847</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-emerald-100">Completed rides</span>
                  <span className="font-bold">15,632</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-emerald-100">Average rating</span>
                  <div className="flex items-center">
                    <span className="font-bold mr-1">4.9</span>
                    <Star className="w-4 h-4 fill-current" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md space-y-8">
            {/* Mobile Logo */}
            <div className="lg:hidden text-center">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center p-2 shadow-lg">
                  <Image
                    src="/ridexlogo.png"
                    alt="RideX Logo"
                    width={48}
                    height={48}
                    className="object-contain"
                    priority
                  />
                </div>
                <h1 className="text-3xl font-bold text-gray-900">RideX</h1>
              </div>
              <p className="text-gray-600">Welcome back to your journey</p>
            </div>

            {/* Login Form - No Card wrapper since Layout provides it */}
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center pb-6">
                <div className="flex justify-center mb-4">
                  <Image
                    src="/ridexlogo.png"
                    alt="RideX Logo"
                    width={80}
                    height={80}
                    className="object-contain drop-shadow-md"
                    priority
                  />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h2>
                <p className="text-gray-600">Sign in to continue your journey with RideX</p>
              </div>

              <form onSubmit={formik.handleSubmit} className="space-y-6">
                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="h-12 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                    {...formik.getFieldProps("email")}
                  />
                  {formik.touched.email && formik.errors.email && (
                    <p className="text-red-500 text-xs mt-1">{formik.errors.email}</p>
                  )}
                </div>

                {/* Password with toggle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                      Password
                    </Label>
                    <Link
                      href="/forgot-password"
                      className="text-sm text-emerald-600 hover:text-emerald-700 transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="h-12 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 pr-12"
                      {...formik.getFieldProps("password")}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {formik.touched.password && formik.errors.password && (
                    <p className="text-red-500 text-xs mt-1">{formik.errors.password}</p>
                  )}
                </div>

                {/* Remember Me */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="remember"
                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <Label htmlFor="remember" className="text-sm text-gray-600">
                    Remember me for 30 days
                  </Label>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                  disabled={formik.isSubmitting || loading}
                >
                  {formik.isSubmitting || loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              {/* Social Login */}
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="h-12 border-gray-200 hover:bg-gray-50 bg-transparent">
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </Button>
                <Button variant="outline" className="h-12 border-gray-200 hover:bg-gray-50 bg-transparent">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Facebook
                </Button>
              </div>

              {/* Sign Up Link */}
              <div className="text-center pt-4 border-t border-gray-100">
                <p className="text-gray-600">
                  Don't have an account?{" "}
                  <Link
                    href="/register"
                    className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                  >
                    Create account
                  </Link>
                </p>
              </div>

              {/* Trust Indicators */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-4">Secure login with industry standards</p>
                  <div className="flex items-center justify-center space-x-4">
                    <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
                      <Shield className="w-3 h-3 mr-1" />
                      256-bit SSL
                    </Badge>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      2FA Ready
                    </Badge>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-100">
                      <Zap className="w-3 h-3 mr-1" />
                      Quick Access
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
