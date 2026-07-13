"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import api, { getApiErrorMessage, isUnauthorized } from "@/lib/api"
import { getSocket } from "@/lib/socket"
import { toast } from "sonner"
import { RideMap } from "@/components/ride-map"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Bike, Car, Crown, LoaderCircle, LocateFixed, MapPin, Phone, Star, X } from "lucide-react"

type Coords = [number, number]
interface Place {
  address: string
  coordinates: Coords
}
interface Suggestion {
  name: string
  address: string
  coordinates: Coords
}
interface Estimate {
  rideType: "bike" | "car" | "premium"
  estimatedFare: number
  currency: string
}
interface RideDetail {
  id: string
  status: string
  rideType: string
  pickup: Place
  destination: Place
  estimatedFare: number | null
  finalFare: number | null
  currency: string
  routePolyline: string | null
  driver: {
    firstName: string
    lastName: string
    phone: string
    ratingAvg: number | null
    ratingCount: number
  } | null
  vehicle: { make: string; model: string; plateNumber: string; color: string | null } | null
}

const RIDE_TYPE_META = {
  bike: { label: "Bike", icon: Bike },
  car: { label: "Car", icon: Car },
  premium: { label: "Premium", icon: Crown },
} as const

const ACTIVE_STATUSES = ["searching", "accepted", "arrived", "in_progress"]

const STATUS_COPY: Record<string, string> = {
  searching: "Finding you a driver…",
  accepted: "Driver is on the way",
  arrived: "Your driver has arrived",
  in_progress: "Enjoy the ride",
  completed: "Ride completed",
}

function LocationField({
  placeholder,
  value,
  onPick,
  accent,
}: {
  placeholder: string
  value: Place | null
  onPick: (p: Place) => void
  accent: string
}) {
  // Show the user's in-progress text while typing; otherwise the picked value
  const [edited, setEdited] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reqId = useRef(0)
  const text = edited ?? value?.address ?? ""

  const search = (q: string) => {
    setEdited(q)
    setOpen(true)
    if (timer.current) clearTimeout(timer.current)
    if (q.trim().length < 2) {
      setSuggestions([])
      setSearched(false)
      setLoading(false)
      return
    }
    setLoading(true)
    const id = ++reqId.current
    timer.current = setTimeout(async () => {
      try {
        const res = await api.get("/geo/search", { params: { q } })
        if (id !== reqId.current) return // a newer keystroke superseded this one
        setSuggestions(res.data.data.results ?? [])
      } catch (err) {
        if (id !== reqId.current) return
        console.error("Location search failed:", err)
        setSuggestions([])
      } finally {
        if (id === reqId.current) {
          setLoading(false)
          setSearched(true)
        }
      }
    }, 350)
  }

  const showDropdown = open && (loading || suggestions.length > 0 || searched)

  return (
    <div className="relative">
      <span
        className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full z-10"
        style={{ background: accent }}
      />
      <Input
        value={text}
        placeholder={placeholder}
        className="pl-8 h-11 bg-white"
        autoComplete="off"
        onChange={(e) => search(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() =>
          setTimeout(() => {
            setOpen(false)
            setEdited(null)
          }, 150)
        }
      />
      {showDropdown && (
        // Opens upward: the panel sits at the bottom of the screen, so a
        // downward dropdown would be clipped by the viewport edge.
        <div className="absolute bottom-full mb-1 z-30 w-full bg-white rounded-md border shadow-lg max-h-56 overflow-auto">
          {loading && (
            <div className="px-3 py-2.5 text-sm text-gray-500 flex items-center">
              <LoaderCircle className="w-4 h-4 mr-2 animate-spin" /> Searching…
            </div>
          )}
          {!loading &&
            suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-50"
                onMouseDown={() => {
                  onPick({ address: s.address || s.name, coordinates: s.coordinates })
                  setEdited(null)
                  setSuggestions([])
                  setOpen(false)
                }}
              >
                <span className="font-medium">{s.name}</span>
                {s.address && s.address !== s.name && (
                  <span className="text-gray-500 block text-xs">{s.address}</span>
                )}
              </button>
            ))}
          {!loading && searched && suggestions.length === 0 && (
            <div className="px-3 py-2.5 text-sm text-gray-500">
              No matches — drop a pin on the map instead.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function BookRidePage() {
  const router = useRouter()
  const [checked, setChecked] = useState(false)
  const [pickup, setPickup] = useState<Place | null>(null)
  const [destination, setDestination] = useState<Place | null>(null)
  const [estimate, setEstimate] = useState<{
    distanceM: number
    durationS: number
    polyline: string | null
    estimates: Estimate[]
  } | null>(null)
  const [selectedType, setSelectedType] = useState<Estimate["rideType"]>("bike")
  const [requesting, setRequesting] = useState(false)
  const [ride, setRide] = useState<RideDetail | null>(null)
  const [driverPos, setDriverPos] = useState<Coords | null>(null)
  const [ratingScore, setRatingScore] = useState(0)
  const [gpsFocus, setGpsFocus] = useState<Coords | null>(null)
  const [locating, setLocating] = useState(false)
  const rideRef = useRef<RideDetail | null>(null)
  useEffect(() => {
    rideRef.current = ride
  }, [ride])

  // Auth + resume any live ride. The identity check and the active-ride
  // lookup are handled separately: only a genuine "not logged in" from
  // /auth/me sends the rider to login. A failure fetching /rides/active
  // (transient, unrelated) must never evict an otherwise-authenticated user.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        await api.get("/auth/me")
      } catch (error) {
        if (!cancelled && isUnauthorized(error)) {
          toast.error("Please sign in to book a ride.")
          router.push("/login")
        }
        if (!cancelled) setChecked(true)
        return
      }
      if (cancelled) return
      setChecked(true)
      try {
        const res = await api.get("/rides/active")
        if (!cancelled && res.data.data.ride) setRide(res.data.data.ride)
      } catch {
        /* non-critical — the rider can still book from a clean slate */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  // Realtime updates
  useEffect(() => {
    let disposed = false
    void getSocket().then((socket) => {
      if (disposed) return
      const onUpdate = (payload: RideDetail) => {
        const current = rideRef.current
        if (!current || payload.id === current.id) setRide(payload)
        if (payload.status === "cancelled") toast.info("Ride cancelled.")
      }
      const onSync = (payload: RideDetail) => setRide(payload)
      const onExpired = ({ rideId }: { rideId: string }) => {
        if (rideRef.current?.id === rideId) {
          setRide(null)
          toast.error("No drivers found right now. Please try again in a moment.")
        }
      }
      const onDriverLocation = (p: { rideId: string; lat: number; lng: number }) => {
        if (rideRef.current?.id === p.rideId) setDriverPos([p.lng, p.lat])
      }
      socket.on("ride:update", onUpdate)
      socket.on("ride:sync", onSync)
      socket.on("ride:expired", onExpired)
      socket.on("driver:location", onDriverLocation)
    })
    return () => {
      disposed = true
    }
  }, [])

  // Poll as a socket fallback while a ride is live
  useEffect(() => {
    if (!ride || !ACTIVE_STATUSES.includes(ride.status)) return
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/rides/${ride.id}`)
        setRide(res.data.data.ride)
      } catch {
        /* transient */
      }
    }, 10_000)
    return () => clearInterval(interval)
  }, [ride])

  // Fare estimate when both endpoints are set (stale estimates are hidden, not cleared)
  useEffect(() => {
    if (!pickup || !destination || ride) return
    let cancelled = false
    api
      .post("/rides/estimate", {
        pickup: pickup.coordinates,
        destination: destination.coordinates,
      })
      .then((res) => {
        if (!cancelled) setEstimate(res.data.data)
      })
      .catch((error) => toast.error(getApiErrorMessage(error, "Could not estimate fare")))
    return () => {
      cancelled = true
    }
  }, [pickup, destination, ride])
  const visibleEstimate = pickup && destination && !ride ? estimate : null

  const place = useCallback(async (kind: "pickup" | "destination", coords: Coords) => {
    let address = "Dropped pin"
    try {
      const res = await api.get("/geo/reverse", { params: { lng: coords[0], lat: coords[1] } })
      address = res.data.data.address
    } catch {
      /* keep fallback label */
    }
    const p = { address, coordinates: coords }
    if (kind === "pickup") setPickup(p)
    else setDestination(p)
  }, [])

  // Ask for the rider's GPS, center the map on it, and default the pickup there.
  // `auto` suppresses error toasts for the silent on-load attempt.
  const locateMe = useCallback((auto = false) => {
    if (!("geolocation" in navigator)) {
      if (!auto) toast.error("Location isn't available in this browser.")
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords: Coords = [pos.coords.longitude, pos.coords.latitude]
        setGpsFocus(coords)
        let address = "Current location"
        try {
          const res = await api.get("/geo/reverse", { params: { lng: coords[0], lat: coords[1] } })
          address = res.data.data.address
        } catch {
          /* keep fallback label */
        }
        setPickup({ address, coordinates: coords })
        setLocating(false)
      },
      (err) => {
        setLocating(false)
        if (!auto) {
          toast.error(
            err.code === err.PERMISSION_DENIED
              ? "Location permission denied — set your pickup on the map instead."
              : "Couldn't get your location — set your pickup on the map instead.",
          )
        }
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    )
  }, [])

  // Once authenticated (and only if there's no active ride and no pickup yet),
  // try to prefill the pickup from GPS. Deferred so the setState in locateMe
  // doesn't run synchronously inside this effect.
  const autoLocatedRef = useRef(false)
  useEffect(() => {
    if (!checked || ride || pickup || autoLocatedRef.current) return
    autoLocatedRef.current = true
    queueMicrotask(() => locateMe(true))
  }, [checked, ride, pickup, locateMe])

  const requestRide = async () => {
    if (!pickup || !destination) return
    try {
      setRequesting(true)
      const res = await api.post("/rides", {
        pickup,
        destination,
        rideType: selectedType,
        paymentMethod: "cash",
      })
      setRide(res.data.data.ride)
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not request the ride"))
    } finally {
      setRequesting(false)
    }
  }

  const cancelRide = async () => {
    if (!ride) return
    try {
      await api.post(`/rides/${ride.id}/cancel`, { reason: "Rider cancelled" })
      setRide(null)
      setDriverPos(null)
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not cancel"))
    }
  }

  const submitRating = async () => {
    if (!ride || ratingScore === 0) return
    try {
      await api.post(`/rides/${ride.id}/rating`, { score: ratingScore })
      toast.success("Thanks for the feedback!")
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not submit rating"))
    } finally {
      setRide(null)
      setDriverPos(null)
      setRatingScore(0)
      setPickup(null)
      setDestination(null)
    }
  }

  if (!checked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading…</p>
      </div>
    )
  }

  const phase = ride?.status ?? "select"
  const showRide = ride !== null
  const mapPickup = ride ? ride.pickup.coordinates : (pickup?.coordinates ?? null)
  const mapDest = ride ? ride.destination.coordinates : (destination?.coordinates ?? null)

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-gray-100">
      <RideMap
        pickup={mapPickup}
        destination={mapDest}
        placing={showRide ? null : pickup ? "destination" : "pickup"}
        onPlace={showRide ? undefined : place}
        routePolyline={ride?.routePolyline ?? estimate?.polyline ?? null}
        driverPosition={driverPos}
        driverVehicle={(ride?.rideType as "bike" | "car" | "premium") ?? null}
        focus={gpsFocus}
        className="absolute inset-0"
      />

      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
        <Link href="/dashboard">
          <Button variant="secondary" size="sm" className="shadow-md">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </Link>
        {showRide && (
          <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 shadow-md px-3 py-1.5">
            {STATUS_COPY[phase] ?? phase}
          </Badge>
        )}
      </div>

      {/* Bottom panel — lifted off the very bottom edge so the search
          dropdown and content stay clear of the browser chrome */}
      <div className="absolute bottom-4 left-0 right-0 z-10 px-4 md:max-w-md md:left-4 md:right-auto md:w-96">
        <Card className="shadow-2xl border-0">
          <CardContent className="p-4 space-y-3">
            {!showRide && (
              <>
                <h2 className="font-semibold text-gray-900">Where to?</h2>
                <LocationField placeholder="Pickup location" value={pickup} onPick={setPickup} accent="#059669" />
                <LocationField placeholder="Destination" value={destination} onPick={setDestination} accent="#dc2626" />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 flex items-center">
                    <MapPin className="w-3.5 h-3.5 mr-1" />
                    Tap the map to set {pickup ? "destination" : "pickup"}, or drag the pins.
                  </p>
                  <button
                    type="button"
                    onClick={() => locateMe(false)}
                    disabled={locating}
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center shrink-0 disabled:opacity-60"
                  >
                    <LocateFixed className={`w-3.5 h-3.5 mr-1 ${locating ? "animate-spin" : ""}`} />
                    {locating ? "Locating…" : "Use my location"}
                  </button>
                </div>

                {visibleEstimate && (
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-3 gap-2">
                      {visibleEstimate.estimates.map((e) => {
                        const Meta = RIDE_TYPE_META[e.rideType]
                        const active = selectedType === e.rideType
                        return (
                          <button
                            key={e.rideType}
                            type="button"
                            onClick={() => setSelectedType(e.rideType)}
                            className={`rounded-lg border p-2.5 text-center transition ${
                              active ? "border-emerald-600 bg-emerald-50" : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <Meta.icon
                              className={`w-5 h-5 mx-auto mb-1 ${active ? "text-emerald-600" : "text-gray-500"}`}
                            />
                            <p className="text-xs font-medium">{Meta.label}</p>
                            <p className="text-sm font-bold">
                              {e.currency} {e.estimatedFare}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                    <p className="text-xs text-gray-500">
                      {(visibleEstimate.distanceM / 1000).toFixed(1)} km · ~{Math.round(visibleEstimate.durationS / 60)} min · cash
                    </p>
                    <Button
                      className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-base"
                      disabled={requesting}
                      onClick={requestRide}
                    >
                      {requesting ? (
                        <LoaderCircle className="w-5 h-5 animate-spin" />
                      ) : (
                        `Request ${RIDE_TYPE_META[selectedType].label}`
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}

            {showRide && phase === "searching" && (
              <div className="text-center py-4 space-y-3">
                <LoaderCircle className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
                <p className="font-medium text-gray-900">Finding nearby drivers…</p>
                <p className="text-sm text-gray-500">
                  {ride.pickup.address} → {ride.destination.address}
                </p>
                <Button variant="outline" className="text-red-600 border-red-200" onClick={cancelRide}>
                  <X className="w-4 h-4 mr-1" /> Cancel
                </Button>
              </div>
            )}

            {showRide && ["accepted", "arrived", "in_progress"].includes(phase) && ride.driver && (
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {ride.driver.firstName[0]}
                    {ride.driver.lastName[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                      {ride.driver.firstName} {ride.driver.lastName}
                    </p>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Star className="w-3.5 h-3.5 text-yellow-500 mr-1" />
                      {ride.driver.ratingAvg ?? "New"} · {ride.vehicle?.make} {ride.vehicle?.model}
                    </p>
                  </div>
                  <a href={`tel:${ride.driver.phone}`}>
                    <Button size="sm" variant="outline">
                      <Phone className="w-4 h-4" />
                    </Button>
                  </a>
                </div>
                {ride.vehicle && (
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold tracking-wider">{ride.vehicle.plateNumber}</p>
                    <p className="text-xs text-gray-500">{ride.vehicle.color ?? ""}</p>
                  </div>
                )}
                <p className="text-sm text-gray-600">
                  Estimated fare: <b>{ride.currency} {ride.estimatedFare}</b> (cash)
                </p>
                {phase !== "in_progress" && (
                  <Button variant="outline" className="w-full text-red-600 border-red-200" onClick={cancelRide}>
                    Cancel ride
                  </Button>
                )}
              </div>
            )}

            {showRide && phase === "completed" && (
              <div className="text-center space-y-3 py-2">
                <p className="text-2xl">🎉</p>
                <p className="font-semibold text-gray-900">Ride completed</p>
                <p className="text-3xl font-bold text-emerald-600">
                  {ride.currency} {ride.finalFare}
                </p>
                <p className="text-sm text-gray-500">Pay your driver in cash</p>
                <div className="flex justify-center space-x-1 py-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setRatingScore(n)}>
                      <Star
                        className={`w-8 h-8 ${n <= ratingScore ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                      />
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setRide(null)
                      setDriverPos(null)
                      setPickup(null)
                      setDestination(null)
                    }}
                  >
                    Skip
                  </Button>
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    disabled={ratingScore === 0}
                    onClick={submitRating}
                  >
                    Rate driver
                  </Button>
                </div>
              </div>
            )}

            {showRide && ["cancelled", "expired"].includes(phase) && (
              <div className="text-center py-3 space-y-3">
                <p className="font-medium text-gray-900">
                  {phase === "expired" ? "No drivers found" : "Ride cancelled"}
                </p>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => {
                    setRide(null)
                    setDriverPos(null)
                  }}
                >
                  Book another ride
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
