"use client"
import { useEffect, useRef, useState } from "react"
import maplibregl, { Map as MlMap, Marker } from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import api, { getApiErrorMessage } from "@/lib/api"
import { getSocket } from "@/lib/socket"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Car, Users, Navigation } from "lucide-react"

const MAP_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? "https://tiles.openfreemap.org/styles/liberty"
const KATHMANDU: [number, number] = [85.3123, 27.7154]

interface OnlineDriver {
  driverId: string
  userId: string
  firstName: string
  lastName: string
  ratingAvg: number | null
  lat: number
  lng: number
  heading: number | null
}

interface ActiveRide {
  id: string
  status: string
  rideType: string
  pickupLat: number
  pickupLng: number
  driverId: string | null
  requestedAt: string
}

function driverEl(): HTMLDivElement {
  const el = document.createElement("div")
  el.style.cssText = `width:26px;height:26px;border-radius:50%;background:#059669;border:2px solid #fff;
    box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;`
  el.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/></svg>'
  return el
}

function rideEl(): HTMLDivElement {
  const el = document.createElement("div")
  el.style.cssText = `width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
    background:#2563eb;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);`
  return el
}

export default function LocationsPage() {
  const mapRef = useRef<MlMap | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const driverMarkers = useRef<Map<string, Marker>>(new Map())
  const rideMarkers = useRef<Map<string, Marker>>(new Map())

  const [drivers, setDrivers] = useState<Map<string, OnlineDriver>>(new Map())
  const [rides, setRides] = useState<ActiveRide[]>([])

  // Initialize the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: KATHMANDU,
      zoom: 12,
    })
    map.addControl(new maplibregl.NavigationControl(), "top-right")
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Initial snapshot.
  useEffect(() => {
    let cancelled = false
    api
      .get("/admin/overview")
      .then((res) => {
        if (cancelled) return
        const list: OnlineDriver[] = res.data.data.drivers
        setDrivers(new Map(list.map((d) => [d.userId, d])))
        setRides(res.data.data.rides)
      })
      .catch((error) => {
        if (!cancelled) toast.error(getApiErrorMessage(error, "Failed to load live map"))
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Live updates over the admins socket room.
  useEffect(() => {
    let live = true
    let cleanup = () => {}
    void getSocket().then((socket) => {
      if (!live) return
      const onLoc = (p: { driverUserId: string; lat: number; lng: number; heading: number | null }) => {
        setDrivers((prev) => {
          const existing = prev.get(p.driverUserId)
          if (!existing) return prev
          const next = new Map(prev)
          next.set(p.driverUserId, { ...existing, lat: p.lat, lng: p.lng, heading: p.heading })
          return next
        })
      }
      const onRide = () => {
        api
          .get("/admin/overview")
          .then((res) => {
            setDrivers(new Map((res.data.data.drivers as OnlineDriver[]).map((d) => [d.userId, d])))
            setRides(res.data.data.rides)
          })
          .catch(() => {})
      }
      socket.on("admin:driver_location", onLoc)
      socket.on("ride:update", onRide)
      cleanup = () => {
        socket.off("admin:driver_location", onLoc)
        socket.off("ride:update", onRide)
      }
    })
    return () => {
      live = false
      cleanup()
    }
  }, [])

  // Sync driver markers when positions change.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const seen = new Set<string>()
    for (const d of drivers.values()) {
      seen.add(d.userId)
      const existing = driverMarkers.current.get(d.userId)
      if (existing) {
        existing.setLngLat([d.lng, d.lat])
      } else {
        const marker = new maplibregl.Marker({ element: driverEl() })
          .setLngLat([d.lng, d.lat])
          .setPopup(new maplibregl.Popup({ offset: 18 }).setText(`${d.firstName} ${d.lastName}`))
          .addTo(map)
        driverMarkers.current.set(d.userId, marker)
      }
    }
    for (const [id, marker] of driverMarkers.current) {
      if (!seen.has(id)) {
        marker.remove()
        driverMarkers.current.delete(id)
      }
    }
  }, [drivers])

  // Sync ride pickup markers.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const seen = new Set<string>()
    for (const r of rides) {
      seen.add(r.id)
      const existing = rideMarkers.current.get(r.id)
      if (existing) {
        existing.setLngLat([r.pickupLng, r.pickupLat])
      } else {
        const marker = new maplibregl.Marker({ element: rideEl() })
          .setLngLat([r.pickupLng, r.pickupLat])
          .setPopup(new maplibregl.Popup({ offset: 14 }).setText(`${r.rideType} · ${r.status}`))
          .addTo(map)
        rideMarkers.current.set(r.id, marker)
      }
    }
    for (const [id, marker] of rideMarkers.current) {
      if (!seen.has(id)) {
        marker.remove()
        rideMarkers.current.delete(id)
      }
    }
  }, [rides])

  const driverList = [...drivers.values()]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Live Operations</h1>
        <p className="text-gray-600 mt-1">Online drivers and active rides, updating in real time.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Online drivers</p>
              <p className="text-2xl font-bold text-crimson">{driverList.length}</p>
            </div>
            <Users className="w-8 h-8 text-crimson" />
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active rides</p>
              <p className="text-2xl font-bold text-blue-600">{rides.length}</p>
            </div>
            <Car className="w-8 h-8 text-blue-600" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-0 shadow-lg lg:col-span-2 overflow-hidden">
          <div ref={containerRef} className="h-[540px] w-full" />
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6 space-y-3 max-h-[540px] overflow-y-auto">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-crimson" />
              Online now
            </h3>
            {driverList.length === 0 ? (
              <p className="text-sm text-gray-500">No drivers online.</p>
            ) : (
              driverList.map((d) => (
                <div key={d.userId} className="flex items-center justify-between text-sm">
                  <span className="text-gray-900">
                    {d.firstName} {d.lastName}
                  </span>
                  <Badge className="bg-jade/12 text-jade hover:bg-jade/12">
                    ★ {d.ratingAvg ?? "new"}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
