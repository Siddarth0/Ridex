"use client"
import Image from "next/image"
import Link from "next/link"
import { useFormik } from "formik"
import * as Yup from "yup"
import { useState } from "react"
import api from "@/lib/api"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Car, ArrowRight, CheckCircle, Shield, DollarSign, Clock } from "lucide-react"

export default function DriverRegisterPage() {
  const [loading, setLoading] = useState(false)

  const validationSchema = Yup.object({
    firstName: Yup.string().required("First Name is required"),
    lastName: Yup.string().required("Last Name is required"),
    phoneNumber: Yup.string()
      .matches(/^\d{10}$/, "Phone number must be 10 digits")
      .required("Phone Number is required"),
    email: Yup.string().email("Invalid email address").required("Email is required"),
    licenseNumber: Yup.string().required("Driver's License Number is required"),
    vehicleYear: Yup.number()
      .min(2010, "Vehicle must be 2010 or newer")
      .max(new Date().getFullYear(), "Invalid year")
      .required("Vehicle year is required"),
    vehicleMake: Yup.string().required("Vehicle make is required"),
    vehicleModel: Yup.string().required("Vehicle model is required"),
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
      licenseNumber: "",
      vehicleYear: "",
      vehicleMake: "",
      vehicleModel: "",
      password: "",
      confirmPassword: "",
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      setLoading(true)
      try {
        await api.post("/auth/driver/register", {
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phoneNumber,
          email: values.email,
          password: values.password,
          dateOfBirth: new Date().toISOString().slice(0, 10),
          licenseNumber: values.licenseNumber,
          licenseExpiry: new Date(new Date().getFullYear() + 1, 0, 1).toISOString().slice(0, 10),
          vehicle: {
            year: Number(values.vehicleYear),
            make: values.vehicleMake,
            model: values.vehicleModel,
            color: "Black",
            plateNumber: "TEMP-0001",
            type: "sedan",
            capacity: 4,
          },
        })
        toast.success("🎉 Driver application submitted! We'll review and get back to you.")
        resetForm()
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Registration failed. Try again.")
      } finally {
        setSubmitting(false)
        setLoading(false)
      }
    },
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        {/* Left Side - Driver Benefits */}
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
              <p className="text-emerald-100 text-lg">Start earning today</p>
            </div>

            <div className="mb-12">
              <h2 className="text-4xl font-bold mb-6 leading-tight">
                Turn Your Car Into
                <span className="block text-emerald-200">Your Business</span>
              </h2>
              <p className="text-xl text-emerald-100 mb-8 leading-relaxed">
                Join thousands of drivers earning flexible income with RideX. Set your own schedule, keep 85% of your
                earnings, and drive when you want.
              </p>
            </div>

            <div className="space-y-6">
              {[
                {
                  icon: <DollarSign className="w-5 h-5" />,
                  title: "Earn More",
                  description: "Keep 85% of your earnings with weekly payouts",
                },
                {
                  icon: <Clock className="w-5 h-5" />,
                  title: "Flexible Schedule",
                  description: "Drive when you want, as much as you want",
                },
                {
                  icon: <Shield className="w-5 h-5" />,
                  title: "Full Support",
                  description: "24/7 driver support and comprehensive insurance",
                },
              ].map((benefit, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    {benefit.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">{benefit.title}</h3>
                    <p className="text-emerald-100 text-sm">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 bg-emerald-500/20 rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-4">Driver Earnings</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-100">Average per hour</span>
                  <span className="font-bold">$25-35</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-emerald-100">Top drivers monthly</span>
                  <span className="font-bold">$4,000+</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-emerald-100">You keep</span>
                  <span className="font-bold">85%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Registration Form */}
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
              <p className="text-gray-600">Start earning today</p>
            </div>

            <div className="space-y-6">
              <div className="text-center pb-6">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Car className="w-8 h-8 text-white" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Become a RideX Driver</h2>
                <p className="text-gray-600">Fill out your application to start earning</p>
              </div>

              <form onSubmit={formik.handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="John"
                      className="h-12"
                      {...formik.getFieldProps("firstName")}
                    />
                    {formik.touched.firstName && formik.errors.firstName && (
                      <p className="text-red-500 text-xs">{formik.errors.firstName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Doe"
                      className="h-12"
                      {...formik.getFieldProps("lastName")}
                    />
                    {formik.touched.lastName && formik.errors.lastName && (
                      <p className="text-red-500 text-xs">{formik.errors.lastName}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="h-12"
                    {...formik.getFieldProps("email")}
                  />
                  {formik.touched.email && formik.errors.email && (
                    <p className="text-red-500 text-xs">{formik.errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="9800000000"
                    className="h-12"
                    {...formik.getFieldProps("phoneNumber")}
                  />
                  {formik.touched.phoneNumber && formik.errors.phoneNumber && (
                    <p className="text-red-500 text-xs">{formik.errors.phoneNumber}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">Driver's License Number</Label>
                  <Input
                    id="licenseNumber"
                    type="text"
                    placeholder="DL123456789"
                    className="h-12"
                    {...formik.getFieldProps("licenseNumber")}
                  />
                  {formik.touched.licenseNumber && formik.errors.licenseNumber && (
                    <p className="text-red-500 text-xs">{formik.errors.licenseNumber}</p>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Vehicle Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="vehicleYear">Year</Label>
                      <Input
                        id="vehicleYear"
                        type="number"
                        placeholder="2020"
                        className="h-12"
                        {...formik.getFieldProps("vehicleYear")}
                      />
                      {formik.touched.vehicleYear && formik.errors.vehicleYear && (
                        <p className="text-red-500 text-xs">{formik.errors.vehicleYear}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vehicleMake">Make</Label>
                      <Input
                        id="vehicleMake"
                        type="text"
                        placeholder="Toyota"
                        className="h-12"
                        {...formik.getFieldProps("vehicleMake")}
                      />
                      {formik.touched.vehicleMake && formik.errors.vehicleMake && (
                        <p className="text-red-500 text-xs">{formik.errors.vehicleMake}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicleModel">Model</Label>
                    <Input
                      id="vehicleModel"
                      type="text"
                      placeholder="Camry"
                      className="h-12"
                      {...formik.getFieldProps("vehicleModel")}
                    />
                    {formik.touched.vehicleModel && formik.errors.vehicleModel && (
                      <p className="text-red-500 text-xs">{formik.errors.vehicleModel}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="h-12"
                      {...formik.getFieldProps("password")}
                    />
                    {formik.touched.password && formik.errors.password && (
                      <p className="text-red-500 text-xs">{formik.errors.password}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      className="h-12"
                      {...formik.getFieldProps("confirmPassword")}
                    />
                    {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                      <p className="text-red-500 text-xs">{formik.errors.confirmPassword}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start space-x-3 text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <p>
                    By applying, you agree to our{" "}
                    <Link href="/driver/terms" className="text-emerald-600 hover:text-emerald-700 underline">
                      Driver Terms
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-emerald-600 hover:text-emerald-700 underline">
                      Privacy Policy
                    </Link>
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                  disabled={formik.isSubmitting || loading}
                >
                  {formik.isSubmitting || loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Submitting Application...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>Submit Application</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </Button>
              </form>

              <div className="text-center pt-4 border-t border-gray-100">
                <p className="text-gray-600">
                  Already a driver?{" "}
                  <Link href="/driver/login" className="text-emerald-600 hover:text-emerald-700 font-medium">
                    Sign in here
                  </Link>
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-4">Next steps after application</p>
                  <div className="flex items-center justify-center space-x-4">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      Background Check
                    </Badge>
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      Vehicle Inspection
                    </Badge>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                      Start Driving
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
