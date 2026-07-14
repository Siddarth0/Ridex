"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import api, { getApiErrorMessage } from "@/lib/api"
import { getSocket } from "@/lib/socket"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RideMap } from "@/components/ride-map"
import { Wordmark } from "@/components/brand/wordmark"
import {
  Bike,
  Car,
  CheckCircle,
  Clock,
  Crown,
  LogOut,
  MapPin,
  Navigation,
  Phone,
  Power,
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
type Coords = [number, number]
type VehicleType = "bike" | "car" | "premium"
interface ActiveRide {
  id: string
  status: string
  rideType: VehicleType
  pickup: { address: string; coordinates: Coords }
  destination: { address: string; coordinates: Coords }
  routePolyline: string | null
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

const RIDE_ICON: Record<string, typeof Bike> = { bike: Bike, car: Car, premium: Crown }
const RIDE_STEPS = ["accepted", "arrived", "in_progress"] as const

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
  const [selfPos, setSelfPos] = useState<Coords | null>(null)
  const [pickupRoute, setPickupRoute] = useState<string | null>(null)
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
          // Update the local map marker every fix; throttle the socket emit
          setSelfPos([pos.coords.longitude, pos.coords.latitude])
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

  // Route from the driver's current position to the pickup, while heading
  // there. Fetched once per ride; the trip route (pickup→destination) uses the
  // ride's stored polyline once the ride is in progress.
  const pickupRouteRideRef = useRef<string | null>(null)
  useEffect(() => {
    if (!ride || !selfPos) return
    if (ride.status !== "accepted" && ride.status !== "arrived") return
    if (pickupRouteRideRef.current === ride.id) return
    pickupRouteRideRef.current = ride.id
    const [pLng, pLat] = ride.pickup.coordinates
    api
      .get("/geo/route", {
        params: { fromLat: selfPos[1], fromLng: selfPos[0], toLat: pLat, toLng: pLng },
      })
      .then((res) => setPickupRoute(res.data.data.polyline))
      .catch(() => {})
  }, [ride, selfPos])

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
      if (action === "accept") {
        setPickupRoute(null)
        pickupRouteRideRef.current = null
        setRide(res.data.data.ride)
      }
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

  const cancelActiveRide = async () => {
    if (!ride) return
    try {
      await api.post(`/rides/${ride.id}/cancel`, { reason: "Driver cancelled" })
      setRide(null)
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not cancel"))
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
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <p className="tnum text-sm text-muted-foreground">loading…</p>
      </div>
    )
  }
  if (!profile) return null

  if (profile.status !== "approved") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-midnight bg-contours px-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-marigold/15 text-marigold">
            <Clock className="h-7 w-7" />
          </span>
          <h1 className="mt-5 font-display text-2xl font-bold text-ink">
            {profile.status === "pending" ? "Application under review" : `Application ${profile.status}`}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {profile.status === "pending"
              ? "We're reviewing your documents. You'll be able to go online once approved."
              : (profile.rejectionReason ?? "Contact support for details.")}
          </p>
          <Button variant="outline" className="mt-6 border-border" onClick={handleLogout}>
            Sign out
          </Button>
        </div>
      </div>
    )
  }

  // Active ride: a navigation-style map view. Heading to the pickup shows the
  // route from the driver's position to the pickup; once at the pickup, it
  // switches to the destination and the trip route.
  if (ride) {
    const toPickup = ride.status === "accepted"
    const target = toPickup ? ride.pickup : ride.destination
    const phaseCopy: Record<string, string> = {
      accepted: "Head to the pickup",
      arrived: "At pickup — start when the rider is in",
      in_progress: "Driving to the destination",
    }
    const stepIndex = RIDE_STEPS.indexOf(ride.status as (typeof RIDE_STEPS)[number])
    return (
      <div className="relative h-screen w-screen overflow-hidden bg-midnight">
        <RideMap
          pickup={ride.pickup.coordinates}
          destination={toPickup ? null : ride.destination.coordinates}
          routePolyline={toPickup ? pickupRoute : ride.routePolyline}
          driverPosition={selfPos}
          driverVehicle={ride.rideType}
          className="absolute inset-0"
        />

        <div className="absolute left-4 right-4 top-4 z-10 flex items-center justify-between">
          <div className="rounded-full bg-midnight/90 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur">
            {phaseCopy[ride.status] ?? ride.status}
          </div>
          {!selfPos && (
            <Badge className="bg-white text-ink shadow-md hover:bg-white">Getting GPS…</Badge>
          )}
        </div>

        <div className="absolute bottom-4 left-0 right-0 z-10 px-4 md:left-4 md:right-auto md:w-[26rem] md:max-w-md">
          <div className="overflow-hidden rounded-3xl bg-white shadow-2xl">
            {/* progress stepper */}
            <div className="flex gap-1.5 px-5 pt-4">
              {RIDE_STEPS.map((s, i) => (
                <span
                  key={s}
                  className={`h-1.5 flex-1 rounded-full ${i <= stepIndex ? "bg-crimson" : "bg-paper-2"}`}
                />
              ))}
            </div>
            <div className="space-y-3 p-5">
              {ride.rider && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-crimson/10 font-display text-sm font-bold text-crimson">
                      {ride.rider.firstName[0]}
                      {ride.rider.lastName[0]}
                    </span>
                    <div>
                      <p className="font-semibold text-ink">
                        {ride.rider.firstName} {ride.rider.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">Rider</p>
                    </div>
                  </div>
                  <a href={`tel:${ride.rider.phone}`}>
                    <Button size="sm" variant="outline" className="border-border">
                      <Phone className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              )}

              <div className="rounded-xl bg-paper p-3">
                <p className="mb-0.5 text-[11px] uppercase tracking-widest text-muted-foreground">
                  {toPickup ? "Pickup" : "Destination"}
                </p>
                <p className="flex items-start font-medium text-ink">
                  {toPickup ? (
                    <MapPin className="mr-2 mt-0.5 h-4 w-4 shrink-0 text-crimson" />
                  ) : (
                    <Navigation className="mr-2 mt-0.5 h-4 w-4 shrink-0 text-midnight" />
                  )}
                  {target.address}
                </p>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-midnight px-4 py-2.5">
                <span className="text-xs text-white/70">Collect in cash</span>
                <span className="tnum text-lg font-bold text-white">
                  <span className="text-marigold">रु</span> {ride.estimatedFare}
                </span>
              </div>

              {NEXT_ACTION[ride.status] && (
                <Button
                  className="h-12 w-full bg-crimson text-base hover:bg-crimson-ink"
                  disabled={acting}
                  onClick={advance}
                >
                  {NEXT_ACTION[ride.status]!.label}
                </Button>
              )}
              {["accepted", "arrived"].includes(ride.status) && (
                <Button
                  variant="outline"
                  className="w-full border-destructive/30 text-destructive hover:bg-destructive/5"
                  onClick={cancelActiveRide}
                >
                  Cancel ride
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-10 border-b border-border bg-paper/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Wordmark tone="dark" href="/driver-dashboard" />
            <span className="hidden items-center gap-1 rounded-full bg-paper-2 px-2.5 py-1 text-xs font-medium text-ink sm:inline-flex">
              <Star className="h-3 w-3 text-marigold" />
              <span className="tnum">{profile.ratingAvg ?? "New"}</span>
              <span className="text-muted-foreground">({profile.ratingCount})</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleOnline}
              disabled={ride !== null}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                online ? "bg-crimson text-white" : "bg-paper-2 text-muted-foreground"
              } ${ride ? "opacity-60" : ""}`}
            >
              <Power className="h-4 w-4" />
              {online ? "Online" : "Offline"}
            </button>
            <Button variant="outline" size="sm" className="border-border" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        {/* Earnings meter */}
        <div className="relative overflow-hidden rounded-3xl bg-midnight bg-contours p-6 text-white">
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-white/60">Today&apos;s earnings</p>
              <p className="tnum mt-1 text-4xl font-bold">
                <span className="text-lg text-marigold">रु</span> {earnings?.total?.toFixed(0) ?? 0}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-widest text-white/60">Rides</p>
              <p className="tnum mt-1 text-4xl font-bold">{earnings?.rides ?? 0}</p>
            </div>
          </div>
        </div>

        {/* Incoming offers */}
        {offers.map((offer) => {
          const remaining = Math.max(
            0,
            offer.expiresInS - (Math.max(nowMs, offer.receivedAt) - offer.receivedAt) / 1000,
          )
          const pct = Math.max(0, Math.min(100, (remaining / offer.expiresInS) * 100))
          const Icon = RIDE_ICON[offer.rideType] ?? Car
          return (
            <div
              key={offer.rideId}
              className="animate-pulse-slow overflow-hidden rounded-3xl border border-crimson/30 bg-white shadow-xl"
            >
              <div className="flex items-center justify-between bg-crimson px-5 py-3 text-white">
                <span className="flex items-center gap-2 font-display font-bold capitalize">
                  <Icon className="h-5 w-5" />
                  New {offer.rideType} request
                </span>
                <span className="tnum rounded-full bg-white/20 px-2.5 py-0.5 text-sm font-bold">
                  {Math.ceil(remaining)}s
                </span>
              </div>
              <div className="h-1 bg-crimson/15">
                <div className="h-full bg-crimson transition-[width] duration-500 ease-linear" style={{ width: `${pct}%` }} />
              </div>
              <div className="space-y-4 p-5">
                <div className="relative pl-6">
                  <span className="absolute left-[6px] top-2 h-2.5 w-2.5 rounded-full bg-crimson ring-4 ring-crimson/15" />
                  <span className="absolute bottom-3 left-[10px] top-5 w-px border-l-2 border-dashed border-ink/20" />
                  <span className="absolute bottom-1 left-[6px] h-2.5 w-2.5 rounded-sm bg-midnight ring-4 ring-midnight/10" />
                  <div className="pb-3">
                    <p className="text-sm font-semibold text-ink">{offer.pickup.address}</p>
                    <p className="tnum text-xs text-muted-foreground">
                      {(offer.pickupDistanceM / 1000).toFixed(1)} km away
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-ink">{offer.destination.address}</p>
                </div>
                <div className="flex items-center justify-between border-t border-dashed border-border pt-3">
                  <span className="tnum text-2xl font-bold text-ink">
                    <span className="text-base text-muted-foreground">रु</span> {offer.estimatedFare}
                  </span>
                  <span className="text-xs text-muted-foreground">cash</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 border-border text-muted-foreground"
                    onClick={() => respond(offer, "decline")}
                  >
                    <X className="mr-1 h-4 w-4" /> Decline
                  </Button>
                  <Button className="flex-1 bg-crimson hover:bg-crimson-ink" onClick={() => respond(offer, "accept")}>
                    <CheckCircle className="mr-1 h-4 w-4" /> Accept
                  </Button>
                </div>
              </div>
            </div>
          )
        })}

        {/* Idle state */}
        {!ride && offers.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
            <span
              className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
                online ? "bg-jade/12 text-jade" : "bg-paper-2 text-muted-foreground"
              }`}
            >
              <Navigation className="h-7 w-7" />
            </span>
            <p className="mt-4 font-display text-lg font-bold text-ink">
              {online ? "You're online" : "You're offline"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {online
                ? "Ride offers will appear here the moment one comes in."
                : "Go online to start receiving ride offers across the valley."}
            </p>
          </div>
        )}

        {/* Recent rides */}
        {history.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="border-b border-border px-5 py-3">
              <h2 className="font-display text-base font-bold text-ink">Recent rides</h2>
            </div>
            <div className="divide-y divide-border">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate text-ink">
                      {h.pickup.address} → {h.destination.address}
                    </p>
                    <p className="text-xs capitalize text-muted-foreground">{h.status.replace("_", " ")}</p>
                  </div>
                  <p className="tnum ml-3 whitespace-nowrap font-semibold text-ink">
                    {h.finalFare != null ? `रु ${h.finalFare}` : "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
