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
import { Car, Users, Shield, Star, ArrowRight, CheckCircle, Zap } from "lucide-react"

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)

  const validationSchema = Yup.object({
    firstName: Yup.string().required("First Name is required"),
    lastName: Yup.string().required("Last Name is required"),
    phoneNumber: Yup.string()
      .matches(/^\d{10}$/, "Phone number must be 10 digits")
      .required("Phone Number is required"),
    email: Yup.string().email("Invalid email address").required("Email is required"),
    password: Yup.string().min(6, "Password must be at least 6 characters").required("Password is required"),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref("password")], "Passwords must match")
      .required("Confirm Password is required"),
  })

  const formik = useFormik({
    initialValues: {
      firstName: "",
      lastName: "",
      phoneNumber: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      setLoading(true)
      try {
        await axios.post("http://localhost:8000/register", values)
        toast.success("🎉 Registration successful! Please log in.")
        resetForm()
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Registration failed. Try again.")
      } finally {
        setSubmitting(false)
        setLoading(false)
      }
    },
  })

  const features = [
    {
      icon: <Car className="w-5 h-5" />,
      title: "Reliable Rides",
      description: "Get where you need to go, when you need to be there",
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: "Trusted Community",
      description: "Join thousands of verified riders and drivers",
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "Safe & Secure",
      description: "Your safety is our top priority with 24/7 support",
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
              <p className="text-emerald-100 text-lg">Your journey starts here</p>
            </div>

            {/* Main Content */}
            <div className="mb-12">
              <h2 className="text-4xl font-bold mb-6 leading-tight">
                Join the Future of
                <span className="block text-emerald-200">Ride Sharing</span>
              </h2>
              <p className="text-xl text-emerald-100 mb-8 leading-relaxed">
                Connect with trusted drivers, enjoy safe rides, and be part of a community that's changing how we move
                around the city.
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

            {/* Stats */}
            <div className="mt-12 grid grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-2xl font-bold mb-1">50K+</div>
                <div className="text-emerald-200 text-sm">Happy Riders</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold mb-1">10K+</div>
                <div className="text-emerald-200 text-sm">Trusted Drivers</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <span className="text-2xl font-bold">4.9</span>
                  <Star className="w-5 h-5 ml-1 fill-current" />
                </div>
                <div className="text-emerald-200 text-sm">Average Rating</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Registration Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md space-y-8">

            {/* Registration Form - No Card wrapper since Layout provides it */}
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
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Join RideX</h2>
                <p className="text-gray-600">Ride with ease. Create your account to start your journey.</p>
              </div>

              <form onSubmit={formik.handleSubmit} className="space-y-6">
                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="John"
                      className="h-12 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                      {...formik.getFieldProps("firstName")}
                    />
                    {formik.touched.firstName && formik.errors.firstName && (
                      <p className="text-red-500 text-xs mt-1">{formik.errors.firstName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Doe"
                      className="h-12 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                      {...formik.getFieldProps("lastName")}
                    />
                    {formik.touched.lastName && formik.errors.lastName && (
                      <p className="text-red-500 text-xs mt-1">{formik.errors.lastName}</p>
                    )}
                  </div>
                </div>

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

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700">
                    Phone Number
                  </Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="9800000000"
                    className="h-12 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                    {...formik.getFieldProps("phoneNumber")}
                  />
                  {formik.touched.phoneNumber && formik.errors.phoneNumber && (
                    <p className="text-red-500 text-xs mt-1">{formik.errors.phoneNumber}</p>
                  )}
                </div>

                {/* Password Fields */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="h-12 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                      {...formik.getFieldProps("password")}
                    />
                    {formik.touched.password && formik.errors.password && (
                      <p className="text-red-500 text-xs mt-1">{formik.errors.password}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                      Confirm Password
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      className="h-12 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                      {...formik.getFieldProps("confirmPassword")}
                    />
                    {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                      <p className="text-red-500 text-xs mt-1">{formik.errors.confirmPassword}</p>
                    )}
                  </div>
                </div>

                {/* Terms */}
                <div className="flex items-start space-x-3 text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <p>
                    By creating an account, you agree to our{" "}
                    <Link href="/terms" className="text-emerald-600 hover:text-emerald-700 underline">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-emerald-600 hover:text-emerald-700 underline">
                      Privacy Policy
                    </Link>
                  </p>
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
                      <span>Creating Account...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>Create Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </Button>
              </form>

              {/* Sign In Link */}
              <div className="text-center pt-4 border-t border-gray-100">
                <p className="text-gray-600">
                  Already have an account?{" "}
                  <Link href="/login" className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
                    Sign in instead
                  </Link>
                </p>
              </div>

              {/* Trust Indicators */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-4">Trusted by riders worldwide</p>
                  <div className="flex items-center justify-center space-x-4">
                    <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
                      <Shield className="w-3 h-3 mr-1" />
                      SSL Secured
                    </Badge>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verified Platform
                    </Badge>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-100">
                      <Zap className="w-3 h-3 mr-1" />
                      Fast Setup
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
