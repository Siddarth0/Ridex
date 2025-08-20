"use client"
import Image from "next/image"
import Link from "next/link"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Car,
  MapPin,
  Shield,
  Clock,
  Star,
  Users,
  ArrowRight,
  Play,
  Smartphone,
  CreditCard,
  Menu,
  X,
  Globe
} from "lucide-react"

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeTestimonial, setActiveTestimonial] = useState(0)

  const features = [
    {
      icon: <Clock className="w-8 h-8" />,
      title: "Quick Booking",
      description: "Book a ride in under 30 seconds with our intuitive app",
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Safe & Secure",
      description: "All drivers are verified with background checks and real-time tracking",
    },
    {
      icon: <CreditCard className="w-8 h-8" />,
      title: "Cashless Payment",
      description: "Pay seamlessly with cards, digital wallets, or ride credits",
    },
    {
      icon: <Star className="w-8 h-8" />,
      title: "Top Rated",
      description: "4.9/5 average rating from over 100k satisfied customers",
    },
  ]

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Daily Commuter",
      image: "/placeholder.svg?height=60&width=60&text=SJ",
      rating: 5,
      text: "RideX has transformed my daily commute. Always reliable, safe, and affordable!",
    },
    {
      name: "Mike Chen",
      role: "Business Traveler",
      image: "/placeholder.svg?height=60&width=60&text=MC",
      rating: 5,
      text: "Perfect for business trips. Professional drivers and always on time.",
    },
    {
      name: "Emily Davis",
      role: "Student",
      image: "/placeholder.svg?height=60&width=60&text=ED",
      rating: 5,
      text: "Great prices for students! The app is super easy to use.",
    },
  ]

  const stats = [
    { number: "1M+", label: "Happy Riders", icon: <Users className="w-6 h-6" /> },
    { number: "50K+", label: "Trusted Drivers", icon: <Car className="w-6 h-6" /> },
    { number: "100+", label: "Cities Covered", icon: <Globe className="w-6 h-6" /> },
    { number: "4.9★", label: "Average Rating", icon: <Star className="w-6 h-6" /> },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [testimonials.length])

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center p-1">
                <Image
                  src="/ridexlogo.png"
                  alt="RideX Logo"
                  width={32}
                  height={32}
                  className="object-contain"
                  priority
                />
              </div>
              <span className="text-2xl font-bold text-gray-900">RideX</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <Link href="#features" className="text-gray-600 hover:text-emerald-600 transition-colors">
                Features
              </Link>
              <Link href="#how-it-works" className="text-gray-600 hover:text-emerald-600 transition-colors">
                How it Works
              </Link>
              <Link href="#pricing" className="text-gray-600 hover:text-emerald-600 transition-colors">
                Pricing
              </Link>
              <Link href="#about" className="text-gray-600 hover:text-emerald-600 transition-colors">
                About
              </Link>
            </div>

            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              <Link href="/driver">
                <Button variant="outline" className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 font-medium bg-transparent">
                  <Car className="w-4 h-4 mr-2" />
                  Drive with RideX
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="ghost" className="text-gray-600 hover:text-emerald-600">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu">
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-100">
              <div className="flex flex-col space-y-4">
                <Link href="#features" className="text-gray-600 hover:text-emerald-600 transition-colors">
                  Features
                </Link>
                <Link href="#how-it-works" className="text-gray-600 hover:text-emerald-600 transition-colors">
                  How it Works
                </Link>
                <Link href="#pricing" className="text-gray-600 hover:text-emerald-600 transition-colors">
                  Pricing
                </Link>
                <Link href="#about" className="text-gray-600 hover:text-emerald-600 transition-colors">
                  About
                </Link>
                
                <div className="flex flex-col space-y-2 pt-4 border-t border-gray-100">
                  <Link href="/driver">
                    <Button variant="outline" className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 font-medium bg-transparent">
                      <Car className="w-4 h-4 mr-2" />
                      Drive with RideX
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="ghost" className="w-full justify-start">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700">Get Started</Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-16 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-64 h-64 bg-emerald-200 rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-teal-200 rounded-full opacity-20 blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="space-y-6">
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 px-4 py-2">
                  <Star className="w-4 h-4 mr-2" />
                  #1 Ride Sharing App
                </Badge>
                <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  Your Journey,
                  <span className="text-emerald-600 block">Our Priority</span>
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Experience the future of transportation with RideX. Safe, reliable, and affordable rides at your
                  fingertips. Join millions of satisfied riders today.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/register">
                  <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white h-14 px-8 text-lg">
                    Start Riding Now
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 px-8 text-lg border-emerald-200 hover:bg-emerald-50 bg-transparent"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Watch Demo
                </Button>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-8">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="flex items-center justify-center mb-2 text-emerald-600">
                      {stat.icon}
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{stat.number}</div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Content - App Preview */}
            <div className="relative">
              <div className="relative z-10">
                <div className="bg-white rounded-3xl shadow-2xl p-8 transform rotate-3 hover:rotate-0 transition-transform duration-500">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center">
                          <Car className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">Book Your Ride</h3>
                          <p className="text-sm text-gray-600">In just a few taps</p>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-700">Online</Badge>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <MapPin className="w-5 h-5 text-emerald-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">From: Your Location</p>
                          <p className="text-xs text-gray-500">123 Main Street</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <MapPin className="w-5 h-5 text-red-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">To: Destination</p>
                          <p className="text-xs text-gray-500">456 Oak Avenue</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 bg-emerald-50 rounded-lg">
                        <Car className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                        <p className="text-xs font-medium">Economy</p>
                        <p className="text-xs text-gray-600">$12</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <Car className="w-6 h-6 text-gray-600 mx-auto mb-1" />
                        <p className="text-xs font-medium">Premium</p>
                        <p className="text-xs text-gray-600">$18</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <Car className="w-6 h-6 text-gray-600 mx-auto mb-1" />
                        <p className="text-xs font-medium">Luxury</p>
                        <p className="text-xs text-gray-600">$25</p>
                      </div>
                    </div>

                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">Confirm Booking</Button>
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-4 -left-4 w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-emerald-600" />
              </div>
              <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center">
                <Star className="w-6 h-6 text-teal-600" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose RideX?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We're not just another ride-sharing app. We're your trusted partner for every journey.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <div className="text-emerald-600">{feature.icon}</div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How RideX Works</h2>
            <p className="text-xl text-gray-600">Getting around has never been easier</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Request a Ride",
                description: "Open the app, enter your destination, and request a ride",
                icon: <Smartphone className="w-8 h-8" />,
              },
              {
                step: "02",
                title: "Get Matched",
                description: "We'll connect you with a nearby driver in seconds",
                icon: <Users className="w-8 h-8" />,
              },
              {
                step: "03",
                title: "Enjoy Your Ride",
                description: "Track your ride in real-time and pay seamlessly",
                icon: <Car className="w-8 h-8" />,
              },
            ].map((item, index) => (
              <div key={index} className="text-center relative">
                <div className="w-20 h-20 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <div className="text-white">{item.icon}</div>
                </div>
                <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                  <span className="text-emerald-600 font-bold text-sm">{item.step}</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
                {index < 2 && (
                  <div className="hidden md:block absolute top-10 left-full w-full h-0.5 bg-emerald-200 transform -translate-y-1/2"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">What Our Riders Say</h2>
            <p className="text-xl text-gray-600">Join thousands of satisfied customers</p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card className="border-0 shadow-xl">
              <CardContent className="p-12 text-center">
                <div className="flex justify-center mb-6">
                  {[...Array(testimonials[activeTestimonial].rating)].map((_, i) => (
                    <Star key={i} className="w-6 h-6 text-yellow-400 fill-current" />
                  ))}
                </div>
                <blockquote className="text-2xl text-gray-900 mb-8 leading-relaxed">
                  "{testimonials[activeTestimonial].text}"
                </blockquote>
                <div className="flex items-center justify-center space-x-4">
                  <Image
                    src={testimonials[activeTestimonial].image || "/placeholder.svg"}
                    alt={testimonials[activeTestimonial].name}
                    width={60}
                    height={60}
                    className="rounded-full"
                  />
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">{testimonials[activeTestimonial].name}</p>
                    <p className="text-gray-600">{testimonials[activeTestimonial].role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Testimonial Indicators */}
            <div className="flex justify-center space-x-2 mt-8">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === activeTestimonial ? "bg-emerald-600" : "bg-gray-300"
                  }`}
                  onClick={() => setActiveTestimonial(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-emerald-600 to-teal-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl font-bold text-white mb-6">Ready to Start Your Journey?</h2>
            <p className="text-xl text-emerald-100 mb-8">
              Join millions of riders who trust RideX for their daily transportation needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="bg-white text-emerald-600 hover:bg-gray-100 h-14 px-8 text-lg">
                  Get Started Today
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-emerald-600 h-14 px-8 text-lg bg-transparent"
                >
                  Sign In
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
            {/* Company Info */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center p-1">
                  <Image src="/ridexlogo.png" alt="RideX Logo" width={32} height={32} className="object-contain" />
                </div>
                <span className="text-2xl font-bold">RideX</span>
              </div>
              <p className="text-gray-400">Your trusted partner for safe, reliable, and affordable transportation.</p>
              <div className="flex space-x-4">
                <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-emerald-600 transition-colors cursor-pointer">
                  <span className="text-sm">f</span>
                </div>
                <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-emerald-600 transition-colors cursor-pointer">
                  <span className="text-sm">t</span>
                </div>
                <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-emerald-600 transition-colors cursor-pointer">
                  <span className="text-sm">in</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                    How it Works
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                    Safety
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support */}
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
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Get in Touch</h3>
              <div className="space-y-2 text-gray-400">
                <p>📧 support@ridex.com</p>
                <p>📞 +1 (555) 123-4567</p>
                <p>📍 123 Tech Street, Silicon Valley</p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 RideX. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
