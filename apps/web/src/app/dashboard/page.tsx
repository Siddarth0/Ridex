"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import api from "@/lib/api"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Car, Clock, LogOut, MapPin, Star } from "lucide-react"

interface Me {
  firstName: string
  lastName: string
  email: string
  role: string
  emailVerified: boolean
}

export default function DashboardPage() {
  const router = useRouter()
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeRide, setActiveRide] = useState<{ id: string; status: string } | null>(null)

  useEffect(() => {
    api
      .get("/auth/me")
      .then(async (res) => {
        setMe(res.data?.data?.user ?? null)
        const active = await api.get("/rides/active")
        setActiveRide(active.data?.data?.ride ?? null)
      })
      .catch(() => {
        toast.error("Please sign in to continue.")
        router.push("/login")
      })
      .finally(() => setLoading(false))
  }, [router])

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout")
    } finally {
      router.push("/login")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading your dashboard…</p>
      </div>
    )
  }

  if (!me) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Image src="/ridexlogo.png" alt="RideX" width={24} height={24} />
            </div>
            <span className="text-xl font-bold text-gray-900">RideX</span>
          </div>
          <div className="flex items-center space-x-3">
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 capitalize">{me.role}</Badge>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {me.firstName}! 👋</h1>
          <p className="text-gray-600 mt-1">Where are you headed today?</p>
        </div>

        {activeRide && (
          <Link href="/book-ride" className="block">
            <Card className="border-emerald-500 border-2 bg-emerald-50 hover:bg-emerald-100 transition">
              <CardContent className="p-4 flex items-center justify-between">
                <p className="font-medium text-emerald-800">
                  🚗 You have a ride in progress — tap to view live status
                </p>
                <Badge className="bg-emerald-600 text-white capitalize">{activeRide.status}</Badge>
              </CardContent>
            </Card>
          </Link>
        )}

        <Card className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white border-0">
          <CardContent className="p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h2 className="text-2xl font-semibold mb-1">Book a ride</h2>
              <p className="text-emerald-50">
                Live booking with maps and fare estimates is on its way. Hang tight!
              </p>
            </div>
            <Link href="/book-ride">
              <Button size="lg" variant="secondary" className="whitespace-nowrap">
                <MapPin className="w-4 h-4 mr-2" />
                Book a ride
              </Button>
            </Link>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500 font-medium flex items-center">
                <Car className="w-4 h-4 mr-2 text-emerald-600" />
                Total rides
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">0</p>
              <p className="text-sm text-gray-500 mt-1">Your rides will appear here</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500 font-medium flex items-center">
                <Clock className="w-4 h-4 mr-2 text-emerald-600" />
                Recent activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">—</p>
              <p className="text-sm text-gray-500 mt-1">No trips yet</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500 font-medium flex items-center">
                <Star className="w-4 h-4 mr-2 text-emerald-600" />
                Your rating
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">New</p>
              <p className="text-sm text-gray-500 mt-1">Complete a ride to get rated</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
