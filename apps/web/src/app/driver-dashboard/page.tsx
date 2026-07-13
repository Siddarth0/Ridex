"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import api, { getApiErrorMessage } from "@/lib/api"
import { getSocket } from "@/lib/socket"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Banknote,
  Car,
  CheckCircle,
  Clock,
  LogOut,
  MapPin,
  Navigation,
  Phone,
  Star,
  X,
} from "lucide-react"

interface DriverProfile {
  status: "pending" | "approved" | "rejected" | "suspended"
  rejectionReason: string | null
  isOnline: boolean
  ratingAvg: number | null
  ratingCount: number
}
interface Offer {
  rideId: string
  rideType: string
  pickup: { address: string }
  destination: { address: string }
  distanceM: number | null
  estimatedFare: number | null
  currency: string
  pickupDistanceM: number
  expiresInS: number
  receivedAt: number
}
interface ActiveRide {
  id: string
  status: string
  pickup: { address: string }
  destination: { address: string }
  estimatedFare: number | null
  finalFare: number | null
  currency: string
  rider: { firstName: string; lastName: string; phone: string } | null
}

const NEXT_ACTION: Record<string, { label: string; endpoint: string } | undefined> = {
  accepted: { label: "I've arrived at pickup", endpoint: "arrive" },
  arrived: { label: "Start ride", endpoint: "start" },
  in_progress: { label: "Complete ride", endpoint: "complete" },
}

export default function DriverDashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<DriverProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [online, setOnline] = useState(false)
  const [offers, setOffers] = useState<Offer[]>([])
  const [ride, setRide] = useState<ActiveRide | null>(null)
  const [earnings, setEarnings] = useState<{ total: number; rides: number } | null>(null)
  const [history, setHistory] = useState<ActiveRide[]>([])
  const [acting, setActing] = useState(false)
  const [nowMs, setNowMs] = useState(0)
  const watchIdRef = useRef<number | null>(null)
  const lastSentRef = useRef(0)
  const rideRef = useRef<ActiveRide | null>(null)
  useEffect(() => {
    rideRef.current = ride
  }, [ride])

  const refreshEarnings = useCallback(async () => {
    try {
      const res = await api.get("/drivers/me/earnings")
      setEarnings(res.data.data.today)
    } catch {
      /* non-critical */
    }
  }, [])

  const refreshHistory = useCallback(async () => {
    try {
      const res = await api.get("/rides", { params: { limit: 5 } })
      setHistory(res.data.data.rides)
    } catch {
      /* non-critical */
    }
  }, [])

  // Bootstrap: profile, active ride, earnings, history. The driver profile
  // fetch decides whether we belong here; a failure fetching the active ride
  // afterwards must not evict an otherwise-authenticated driver.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const profileRes = await api.get("/drivers/me")
        if (cancelled) return
        const driver = profileRes.data.data.driver
        setProfile(driver)
        setOnline(driver.isOnline)
      } catch {
        if (!cancelled) {
          toast.error("Sign in with a driver account to continue.")
          router.push("/driver/login")
        }
        if (!cancelled) setLoading(false)
        return
      }
      try {
        const activeRes = await api.get("/rides/active")
        if (!cancelled && activeRes.data.data.ride) setRide(activeRes.data.data.ride)
      } catch {
        /* non-critical — the dashboard still works without this */
      }
      if (!cancelled) setLoading(false)
    })()
    queueMicrotask(() => {
      void refreshEarnings()
      void refreshHistory()
    })
    return () => {
      cancelled = true
    }
  }, [router, refreshEarnings, refreshHistory])

  // Socket: offers + ride lifecycle
  useEffect(() => {
    let disposed = false
    void getSocket().then((socket) => {
      if (disposed) return
      socket.on("ride:offer", (payload: Omit<Offer, "receivedAt">) => {
        setOffers((prev) =>
          prev.some((o) => o.rideId === payload.rideId)
            ? prev
            : [...prev, { ...payload, receivedAt: Date.now() }],
        )
      })
      socket.on("ride:offer_revoked", ({ rideId }: { rideId: string }) => {
        setOffers((prev) => prev.filter((o) => o.rideId !== rideId))
      })
      const onRide = (payload: ActiveRide) => {
        if (["completed", "cancelled"].includes(payload.status)) {
          if (rideRef.current?.id === payload.id) {
            setRide(null)
            if (payload.status === "cancelled") toast.info("The ride was cancelled.")
          }
          void refreshEarnings()
          void refreshHistory()
        } else {
          setRide(payload)
        }
      }
      socket.on("ride:update", onRide)
      socket.on("ride:sync", (payload: ActiveRide) => setRide(payload))
    })
    return () => {
      disposed = true
    }
  }, [refreshEarnings, refreshHistory])

  // Offer countdowns repaint + expiry cleanup
  useEffect(() => {
    if (offers.length === 0) return
    const t = setInterval(() => {
      const now = Date.now()
      setNowMs(now)
      setOffers((prev) => prev.filter((o) => now - o.receivedAt < o.expiresInS * 1000))
    }, 500)
    return () => clearInterval(t)
  }, [offers.length])

  // GPS streaming while online (and always during an active ride)
  useEffect(() => {
    const shouldStream = online || ride !== null
    if (!shouldStream || !("geolocation" in navigator)) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      return
    }
    let disposed = false
    void getSocket().then((socket) => {
      if (disposed) return
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const now = Date.now()
          if (now - lastSentRef.current < 3000) return
          lastSentRef.current = now
          socket.emit("location:update", {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            heading: pos.coords.heading != null ? Math.round(pos.coords.heading) : undefined,
            speedKmh: pos.coords.speed != null ? Math.max(0, pos.coords.speed * 3.6) : undefined,
          })
        },
        () => toast.error("Location access is required to receive ride offers."),
        { enableHighAccuracy: true, maximumAge: 5000 },
      )
    })
    return () => {
      disposed = true
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [online, ride])

  const toggleOnline = async () => {
    try {
      const res = await api.post("/drivers/me/online", { online: !online })
      setOnline(res.data.data.isOnline)
      if (res.data.data.isOnline) toast.success("You're online — waiting for ride offers.")
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not change availability"))
    }
  }

  const respond = async (offer: Offer, action: "accept" | "decline") => {
    setOffers((prev) => prev.filter((o) => o.rideId !== offer.rideId))
    try {
      const res = await api.post(`/rides/${offer.rideId}/${action}`)
      if (action === "accept") setRide(res.data.data.ride)
    } catch (error) {
      if (action === "accept") toast.error(getApiErrorMessage(error, "Offer no longer available"))
    }
  }

  const advance = async () => {
    if (!ride) return
    const action = NEXT_ACTION[ride.status]
    if (!action) return
    try {
      setActing(true)
      const res = await api.post(`/rides/${ride.id}/${action.endpoint}`)
      const updated = res.data.data.ride
      if (updated.status === "completed") {
        setRide(null)
        toast.success(`Ride completed — collect ${updated.currency} ${updated.finalFare} in cash.`)
        void refreshEarnings()
        void refreshHistory()
      } else {
        setRide(updated)
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Action failed"))
    } finally {
      setActing(false)
    }
  }

  const handleLogout = async () => {
    try {
      if (online) await api.post("/drivers/me/online", { online: false })
      await api.post("/auth/logout")
    } finally {
      router.push("/driver/login")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading your dashboard…</p>
      </div>
    )
  }
  if (!profile) return null

  if (profile.status !== "approved") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-3">
            <Clock className="w-10 h-10 text-yellow-500 mx-auto" />
            <h1 className="text-xl font-bold text-gray-900">
              {profile.status === "pending" ? "Application under review" : "Application " + profile.status}
            </h1>
            <p className="text-gray-600 text-sm">
              {profile.status === "pending"
                ? "We're reviewing your documents. You'll be able to go online once approved."
                : (profile.rejectionReason ?? "Contact support for details.")}
            </p>
            <Button variant="outline" onClick={handleLogout}>
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Image src="/ridexlogo.png" alt="RideX" width={22} height={22} />
            </div>
            <div>
              <p className="font-bold text-gray-900 leading-tight">Driver</p>
              <p className="text-xs text-gray-500 flex items-center">
                <Star className="w-3 h-3 text-yellow-500 mr-0.5" />
                {profile.ratingAvg ?? "New"} ({profile.ratingCount})
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={toggleOnline}
              disabled={ride !== null}
              className={`relative inline-flex h-8 w-24 items-center rounded-full transition font-medium text-sm ${
                online ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-600"
              } ${ride ? "opacity-60" : ""}`}
            >
              <span className="w-full text-center">{online ? "Online" : "Offline"}</span>
            </button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Earnings strip */}
        <Card className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white border-0">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm">Today&apos;s earnings</p>
              <p className="text-3xl font-bold">NPR {earnings?.total?.toFixed(0) ?? 0}</p>
            </div>
            <div className="text-right">
              <p className="text-emerald-100 text-sm">Rides</p>
              <p className="text-3xl font-bold">{earnings?.rides ?? 0}</p>
            </div>
            <Banknote className="w-10 h-10 text-emerald-200" />
          </CardContent>
        </Card>

        {/* Incoming offers */}
        {offers.map((offer) => {
          const remaining = Math.max(0, offer.expiresInS - (Math.max(nowMs, offer.receivedAt) - offer.receivedAt) / 1000)
          return (
            <Card key={offer.rideId} className="border-2 border-emerald-500 shadow-lg animate-pulse-slow">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center">
                  <Car className="w-5 h-5 mr-2 text-emerald-600" />
                  New ride request · {offer.rideType}
                </CardTitle>
                <Badge className="bg-emerald-100 text-emerald-700">{Math.ceil(remaining)}s</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-1">
                  <p className="flex items-start">
                    <MapPin className="w-4 h-4 mr-2 mt-0.5 text-emerald-600 shrink-0" />
                    {offer.pickup.address}
                    <span className="text-gray-400 ml-1">
                      ({(offer.pickupDistanceM / 1000).toFixed(1)} km away)
                    </span>
                  </p>
                  <p className="flex items-start">
                    <Navigation className="w-4 h-4 mr-2 mt-0.5 text-red-500 shrink-0" />
                    {offer.destination.address}
                  </p>
                </div>
                <p className="font-bold text-lg text-gray-900">
                  {offer.currency} {offer.estimatedFare}
                  <span className="text-sm text-gray-500 font-normal"> · cash</span>
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 text-red-600 border-red-200"
                    onClick={() => respond(offer, "decline")}
                  >
                    <X className="w-4 h-4 mr-1" /> Decline
                  </Button>
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => respond(offer, "accept")}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" /> Accept
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {/* Active ride */}
        {ride && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Current ride</span>
                <Badge className="bg-emerald-100 text-emerald-700 capitalize">
                  {ride.status.replace("_", " ")}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ride.rider && (
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <div>
                    <p className="font-semibold">
                      {ride.rider.firstName} {ride.rider.lastName}
                    </p>
                    <p className="text-sm text-gray-500">Rider</p>
                  </div>
                  <a href={`tel:${ride.rider.phone}`}>
                    <Button size="sm" variant="outline">
                      <Phone className="w-4 h-4" />
                    </Button>
                  </a>
                </div>
              )}
              <div className="text-sm space-y-1">
                <p className="flex items-start">
                  <MapPin className="w-4 h-4 mr-2 mt-0.5 text-emerald-600 shrink-0" />
                  {ride.pickup.address}
                </p>
                <p className="flex items-start">
                  <Navigation className="w-4 h-4 mr-2 mt-0.5 text-red-500 shrink-0" />
                  {ride.destination.address}
                </p>
              </div>
              <p className="text-sm text-gray-600">
                Fare: <b>{ride.currency} {ride.estimatedFare}</b> · collect in cash
              </p>
              {NEXT_ACTION[ride.status] && (
                <Button
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700"
                  disabled={acting}
                  onClick={advance}
                >
                  {NEXT_ACTION[ride.status]!.label}
                </Button>
              )}
              {["accepted", "arrived"].includes(ride.status) && (
                <Button
                  variant="outline"
                  className="w-full text-red-600 border-red-200"
                  onClick={async () => {
                    try {
                      await api.post(`/rides/${ride.id}/cancel`, { reason: "Driver cancelled" })
                      setRide(null)
                    } catch (error) {
                      toast.error(getApiErrorMessage(error, "Could not cancel"))
                    }
                  }}
                >
                  Cancel ride
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Idle state */}
        {!ride && offers.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-gray-500">
              {online
                ? "You're online. Ride offers will appear here."
                : "Go online to start receiving ride offers."}
            </CardContent>
          </Card>
        )}

        {/* Recent rides */}
        {history.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recent rides</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {history.map((h) => (
                <div key={h.id} className="py-2.5 flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <p className="truncate text-gray-900">
                      {h.pickup.address} → {h.destination.address}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">{h.status.replace("_", " ")}</p>
                  </div>
                  <p className="font-semibold whitespace-nowrap ml-3">
                    {h.finalFare != null ? `${h.currency} ${h.finalFare}` : "—"}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
