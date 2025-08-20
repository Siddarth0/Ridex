"use client"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Car,
  DollarSign,
  Clock,
  Shield,
  Star,
  ArrowRight,
  TrendingUp,
  CheckCircle,
  Menu,
  X,
  MapPin,
  BarChart3,
} from "lucide-react"

export default function DriverLandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const benefits = [
    {
      icon: <DollarSign className="w-8 h-8" />,
      title: "Earn More",
      description: "Make up to $2,500+ per month driving on your schedule",
      highlight: "$2,500+/month",
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: "Flexible Schedule",
      description: "Drive when you want, where you want. You're in control",
      highlight: "24/7 Flexibility",
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Safety First",
      description: "Comprehensive insurance coverage and 24/7 support",
      highlight: "Full Coverage",
    },
    {
      icon: <Star className="w-8 h-8" />,
      title: "Top Rated Platform",
      description: "Join the highest-rated ride-sharing platform",
      highlight: "4.9★ Rating",
    },
  ]

  const requirements = [
    "Valid driver's license (2+ years)",
    "Clean driving record",
    "Vehicle 2010 or newer",
    "Pass background check",
    "Smartphone with data plan",
    "Auto insurance",
  ]

  const earnings = [
    { city: "New York", amount: "$3,200", period: "per month" },
    { city: "Los Angeles", amount: "$2,800", period: "per month" },
    { city: "Chicago", amount: "$2,400", period: "per month" },
    { city: "Miami", amount: "$2,600", period: "per month" },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-md border-b border-gray-100 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-18">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center p-1 shadow-lg">
                <Image
                  src="/ridexlogo.png"
                  alt="RideX Logo"
                  width={36}
                  height={36}
                  className="object-contain"
                  priority
                />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                RideX Driver
              </span>
            </Link>

            <div className="hidden lg:flex items-center space-x-8">
              <Link href="#earnings" className="text-gray-600 hover:text-emerald-600 transition-colors font-medium">
                Earnings
              </Link>
              <Link href="#requirements" className="text-gray-600 hover:text-emerald-600 transition-colors font-medium">
                Requirements
              </Link>
              <Link href="#safety" className="text-gray-600 hover:text-emerald-600 transition-colors font-medium">
                Safety
              </Link>
              <Link href="#support" className="text-gray-600 hover:text-emerald-600 transition-colors font-medium">
                Support
              </Link>
            </div>

            <div className="hidden lg:flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" className="text-gray-600 hover:text-emerald-600 font-medium">
                  ← Back to RideX
                </Button>
              </Link>
              <Link href="/driver/login">
                <Button variant="ghost" className="text-gray-600 hover:text-emerald-600 font-medium">
                  Driver Sign In
                </Button>
              </Link>
              <Link href="/driver/register">
                <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg">
                  Start Driving
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            <button className="lg:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {isMenuOpen && (
            <div className="lg:hidden py-6 border-t border-gray-100">
              <div className="flex flex-col space-y-4">
                <Link href="#earnings" className="text-gray-600 hover:text-emerald-600 transition-colors font-medium">
                  Earnings
                </Link>
                <Link
                  href="#requirements"
                  className="text-gray-600 hover:text-emerald-600 transition-colors font-medium"
                >
                  Requirements
                </Link>
                <Link href="#safety" className="text-gray-600 hover:text-emerald-600 transition-colors font-medium">
                  Safety
                </Link>
                <Link href="#support" className="text-gray-600 hover:text-emerald-600 transition-colors font-medium">
                  Support
                </Link>
                <div className="flex flex-col space-y-3 pt-4 border-t border-gray-100">
                  <Link href="/">
                    <Button variant="ghost" className="w-full justify-center">
                      ← Back to RideX
                    </Button>
                  </Link>
                  <Link href="/driver/login">
                    <Button variant="ghost" className="w-full justify-center">
                      Driver Sign In
                    </Button>
                  </Link>
                  <Link href="/driver/register">
                    <Button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600">Start Driving</Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-18 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 relative overflow-hidden min-h-screen flex items-center">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-br from-emerald-200 to-teal-200 rounded-full opacity-20 blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-br from-teal-200 to-cyan-200 rounded-full opacity-20 blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-10">
              <div className="space-y-8">
                <Badge className="bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 px-6 py-3 text-lg font-medium">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  #1 Driver Platform
                </Badge>
                <h1 className="text-6xl lg:text-7xl font-bold text-gray-900 leading-tight">
                  Drive & Earn
                  <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent block">
                    On Your Terms
                  </span>
                </h1>
                <p className="text-2xl text-gray-600 leading-relaxed">
                  Turn your car into a money-making machine. Join thousands of drivers earning flexible income with
                  RideX. Start today and be your own boss.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-6">
                <Link href="/driver/register">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white h-16 px-10 text-xl font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                  >
                    Start Driving Today
                    <ArrowRight className="w-6 h-6 ml-3" />
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-16 px-10 text-xl font-semibold border-2 border-emerald-200 hover:bg-emerald-50 bg-white/80 backdrop-blur-sm shadow-lg"
                >
                  <BarChart3 className="w-6 h-6 mr-3" />
                  View Earnings
                </Button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 pt-12">
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-600 mb-1">$2,500+</div>
                  <div className="text-sm text-gray-600 font-medium">Avg Monthly</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-600 mb-1">100K+</div>
                  <div className="text-sm text-gray-600 font-medium">Active Drivers</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-600 mb-1">24/7</div>
                  <div className="text-sm text-gray-600 font-medium">Drive Anytime</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-600 mb-1">85%</div>
                  <div className="text-sm text-gray-600 font-medium">You Keep</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <Card className="bg-white rounded-3xl shadow-2xl p-8 transform hover:rotate-0 transition-all duration-700">
                <CardContent className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center">
                        <Car className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-xl text-gray-900">Driver Dashboard</h3>
                        <p className="text-emerald-600 font-medium">Online & Earning</p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700 px-4 py-2 font-semibold">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                      Active
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 rounded-xl">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-600 font-medium">Today's Earnings</span>
                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="text-3xl font-bold text-gray-900">$247.50</div>
                      <div className="text-sm text-emerald-600 font-medium">+18% from yesterday</div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-xl text-center">
                        <div className="text-2xl font-bold text-gray-900">12</div>
                        <div className="text-sm text-gray-600">Trips Today</div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-xl text-center">
                        <div className="text-2xl font-bold text-gray-900">4.9★</div>
                        <div className="text-sm text-gray-600">Your Rating</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900">Recent Trips</h4>
                      {[
                        { from: "Downtown", to: "Airport", amount: "$28.50", time: "2:30 PM" },
                        { from: "Mall", to: "University", amount: "$15.75", time: "1:45 PM" },
                      ].map((trip, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <MapPin className="w-4 h-4 text-emerald-600" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {trip.from} → {trip.to}
                              </p>
                              <p className="text-xs text-gray-600">{trip.time}</p>
                            </div>
                          </div>
                          <span className="font-semibold text-emerald-600">{trip.amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">Why Drive with RideX?</h2>
            <p className="text-2xl text-gray-600 max-w-3xl mx-auto">
              Join the platform that puts drivers first with better earnings, flexibility, and support.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <Card
                key={index}
                className="border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
              >
                <CardContent className="p-10 text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-8">
                    <div className="text-emerald-600">{benefit.icon}</div>
                  </div>
                  <div className="text-2xl font-bold text-emerald-600 mb-2">{benefit.highlight}</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{benefit.title}</h3>
                  <p className="text-gray-600">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Earnings Section */}
      <section id="earnings" className="py-24 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">Real Earnings from Real Drivers</h2>
            <p className="text-2xl text-gray-600">See what drivers in your city are earning</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {earnings.map((earning, index) => (
              <Card key={index} className="border-0 shadow-xl">
                <CardContent className="p-8 text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{earning.city}</h3>
                  <div className="text-4xl font-bold text-emerald-600 mb-2">{earning.amount}</div>
                  <p className="text-gray-600">{earning.period}</p>
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <p className="text-sm text-gray-500">Average earnings for active drivers</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-16">
            <Card className="max-w-4xl mx-auto border-0 shadow-xl bg-gradient-to-r from-emerald-50 to-teal-50">
              <CardContent className="p-12">
                <h3 className="text-3xl font-bold text-gray-900 mb-6">Maximize Your Earnings</h3>
                <div className="grid md:grid-cols-3 gap-8">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Clock className="w-8 h-8 text-white" />
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">Peak Hours</h4>
                    <p className="text-gray-600">Drive during rush hours and weekends for higher fares</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MapPin className="w-8 h-8 text-white" />
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">Hot Zones</h4>
                    <p className="text-gray-600">Stay in high-demand areas for more ride requests</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Star className="w-8 h-8 text-white" />
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">High Rating</h4>
                    <p className="text-gray-600">Maintain 4.8+ rating for premium ride opportunities</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Requirements Section */}
      <section id="requirements" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-5xl font-bold text-gray-900 mb-8">Simple Requirements to Get Started</h2>
              <p className="text-xl text-gray-600 mb-12">
                Getting started as a RideX driver is easy. Here's what you need to begin earning.
              </p>

              <div className="space-y-4">
                {requirements.map((requirement, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    </div>
                    <span className="text-lg text-gray-700">{requirement}</span>
                  </div>
                ))}
              </div>

              <div className="mt-12">
                <Link href="/driver/register">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white h-14 px-8 text-lg"
                  >
                    Apply Now - It's Free
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative">
              <Card className="border-0 shadow-2xl">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Application Process</h3>
                  <div className="space-y-6">
                    {[
                      {
                        step: 1,
                        title: "Submit Application",
                        time: "5 minutes",
                        description: "Fill out basic information and upload required documents",
                      },
                      {
                        step: 2,
                        title: "Background Check",
                        time: "2-3 days",
                        description: "We'll verify your driving record and run a background check",
                      },
                      {
                        step: 3,
                        title: "Vehicle Inspection",
                        time: "30 minutes",
                        description: "Quick inspection at one of our partner locations",
                      },
                      {
                        step: 4,
                        title: "Start Driving",
                        time: "Same day",
                        description: "Download the driver app and start earning immediately",
                      },
                    ].map((step, index) => (
                      <div key={index} className="flex items-start space-x-4">
                        <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold">{step.step}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-gray-900">{step.title}</h4>
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                              {step.time}
                            </Badge>
                          </div>
                          <p className="text-gray-600">{step.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-5xl font-bold text-white mb-8">Ready to Start Earning?</h2>
            <p className="text-2xl text-emerald-100 mb-12">
              Join thousands of drivers who've already made the switch to RideX. Start your application today and begin
              earning this week.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link href="/driver/register">
                <Button
                  size="lg"
                  className="bg-white text-emerald-600 hover:bg-gray-100 h-16 px-10 text-xl font-bold shadow-2xl"
                >
                  Start Driving Today
                  <ArrowRight className="w-6 h-6 ml-3" />
                </Button>
              </Link>
              <Link href="/driver/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-white text-white hover:bg-white hover:text-emerald-600 h-16 px-10 text-xl font-bold bg-transparent"
                >
                  Driver Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center p-1">
                  <Image src="/ridexlogo.png" alt="RideX Logo" width={32} height={32} className="object-contain" />
                </div>
                <span className="text-2xl font-bold">RideX Driver</span>
              </div>
              <p className="text-gray-400">Drive on your terms. Earn on your schedule.</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">For Drivers</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                    Drive with RideX
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                    Driver Requirements
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                    Earnings
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                    Driver Support
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                    Driver Hub
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                    Safety
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                    Insurance
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                    Tax Information
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                    Community
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                    24/7 Support
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 RideX. All rights reserved. Drive safely, earn responsibly.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
