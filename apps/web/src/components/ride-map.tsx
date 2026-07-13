"use client"
import { useEffect, useRef, useState } from "react"
import maplibregl, { Map as MlMap, Marker } from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { decodePolyline } from "@/lib/polyline"

// Free, keyless OSM style; swap via NEXT_PUBLIC_MAP_STYLE_URL if desired
const MAP_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? "https://tiles.openfreemap.org/styles/liberty"

const KATHMANDU: [number, number] = [85.3123, 27.7154]

type VehicleType = "bike" | "car" | "premium"

export interface RideMapProps {
  pickup: [number, number] | null
  destination: [number, number] | null
  /** Fired when the user drags a pin or clicks the map in a placement mode. */
  onPlace?: (kind: "pickup" | "destination", coords: [number, number]) => void
  /** Which pin a map click places; null disables click placement. */
  placing?: "pickup" | "destination" | null
  routePolyline?: string | null
  driverPosition?: [number, number] | null
  /** Vehicle type for the live marker's icon; falls back to a plain dot. */
  driverVehicle?: VehicleType | null
  /** Where to center the map before any pins exist (e.g. the user's GPS). */
  focus?: [number, number] | null
  className?: string
}

// Lucide icon geometry, inlined so it can live on a raw DOM marker element
const CAR_SVG =
  '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>'
const BIKE_SVG =
  '<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>'

function makeVehicleMarker(vehicle: VehicleType): HTMLDivElement {
  const el = document.createElement("div")
  el.style.cssText = `width:30px;height:30px;border-radius:50%;background:#fff;
    display:flex;align-items:center;justify-content:center;color:#059669;
    border:2px solid #059669;box-shadow:0 2px 6px rgba(0,0,0,.35);`
  const paths = vehicle === "bike" ? BIKE_SVG : CAR_SVG
  el.innerHTML =
    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
    `stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`
  return el
}

function makePin(color: string): HTMLDivElement {
  const el = document.createElement("div")
  el.style.cssText = `width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
    background:${color};border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35);cursor:grab;`
  return el
}

function makeDriverDot(): HTMLDivElement {
  // Blue = a live GPS position (the driver's car on the rider's map, or the
  // driver's own location on their map) — distinct from the teardrop pins.
  const el = document.createElement("div")
  el.style.cssText = `width:16px;height:16px;border-radius:50%;background:#2563eb;
    border:3px solid white;box-shadow:0 0 0 6px rgba(37,99,235,.25);`
  return el
}

export function RideMap({
  pickup,
  destination,
  onPlace,
  placing = null,
  routePolyline,
  driverPosition,
  driverVehicle,
  focus,
  className,
}: RideMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MlMap | null>(null)
  const pickupMarker = useRef<Marker | null>(null)
  const destMarker = useRef<Marker | null>(null)
  const driverMarker = useRef<Marker | null>(null)
  const placingRef = useRef(placing)
  const onPlaceRef = useRef(onPlace)
  const hasFocusedRef = useRef(false)
  const [failed, setFailed] = useState<string | null>(null)

  useEffect(() => {
    placingRef.current = placing
    onPlaceRef.current = onPlace
  }, [placing, onPlace])

  // Map lifecycle
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    let map: MlMap
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: MAP_STYLE,
        center: KATHMANDU,
        zoom: 13,
        attributionControl: { compact: true },
      })
    } catch (err) {
      // WebGL unavailable/disabled throws synchronously here
      console.error("Map failed to initialize:", err)
      queueMicrotask(() => setFailed("Your browser could not start the map (WebGL may be disabled)."))
      return
    }

    // Surface load/tile/style failures instead of showing a blank canvas
    map.on("error", (e) => {
      console.error("Map error:", e.error ?? e)
    })
    // The container is often measured before layout settles; force a resize
    // once the style is ready so the canvas fills its box.
    map.on("load", () => {
      map.resize()
      setFailed(null)
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right")
    map.on("click", (e) => {
      const mode = placingRef.current
      if (mode && onPlaceRef.current) {
        onPlaceRef.current(mode, [e.lngLat.lng, e.lngLat.lat])
      }
    })
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Keep the canvas sized to its container even if the box changes after init
  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver(() => mapRef.current?.resize())
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // Recenter on an external focus point (the rider's GPS) until they pick a pin
  useEffect(() => {
    const map = mapRef.current
    if (!map || !focus || hasFocusedRef.current || pickup) return
    hasFocusedRef.current = true
    map.easeTo({ center: focus, zoom: 15 })
  }, [focus, pickup])

  // Pickup / destination pins
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const sync = (
      coords: [number, number] | null,
      ref: React.RefObject<Marker | null>,
      color: string,
      kind: "pickup" | "destination",
    ) => {
      if (!coords) {
        ref.current?.remove()
        ref.current = null
        return
      }
      if (!ref.current) {
        ref.current = new maplibregl.Marker({ element: makePin(color), draggable: true, anchor: "bottom" })
          .setLngLat(coords)
          .addTo(map)
        ref.current.on("dragend", () => {
          const p = ref.current!.getLngLat()
          onPlaceRef.current?.(kind, [p.lng, p.lat])
        })
      } else {
        ref.current.setLngLat(coords)
      }
    }
    sync(pickup, pickupMarker, "#059669", "pickup")
    sync(destination, destMarker, "#dc2626", "destination")
  }, [pickup, destination])

  // Framing: fit to the drawn route (which spans both endpoints), else to the
  // pins. Keyed so it only reframes when the context changes — not on every
  // driver-position tick.
  const fitKeyRef = useRef("")
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const routeCoords = routePolyline
      ? decodePolyline(routePolyline)
      : pickup && destination
        ? [pickup, destination]
        : null
    const key = JSON.stringify({ routePolyline, pickup, destination })
    if (key === fitKeyRef.current) return
    fitKeyRef.current = key
    const frame = () => {
      if (routeCoords && routeCoords.length > 0) {
        const first = routeCoords[0]!
        const bounds = routeCoords.reduce(
          (b, c) => b.extend(c),
          new maplibregl.LngLatBounds(first, first),
        )
        map.fitBounds(bounds, { padding: 70, maxZoom: 16 })
      } else if (pickup) {
        map.easeTo({ center: pickup, zoom: 14 })
      }
    }
    if (map.isStyleLoaded()) frame()
    else map.once("load", frame)
  }, [routePolyline, pickup, destination])

  // Route line. Prefer the real routed polyline; if routing degraded to no
  // polyline but we have both endpoints, fall back to a straight line so the
  // rider always sees a connection. Re-runs whenever any of these change.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const apply = () => {
      const coordinates = routePolyline
        ? decodePolyline(routePolyline)
        : pickup && destination
          ? [pickup, destination]
          : null

      const existing = map.getSource("route") as maplibregl.GeoJSONSource | undefined
      if (!coordinates) {
        if (existing) {
          map.removeLayer("route-line")
          map.removeSource("route")
        }
        return
      }
      const geojson = {
        type: "Feature" as const,
        properties: {},
        geometry: { type: "LineString" as const, coordinates },
      }
      // Solid for a real route, dashed for the straight-line fallback
      const dash = routePolyline ? undefined : [2, 1.5]
      if (existing) {
        existing.setData(geojson)
        map.setPaintProperty("route-line", "line-dasharray", dash)
      } else {
        map.addSource("route", { type: "geojson", data: geojson })
        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#0d9488",
            "line-width": 4.5,
            "line-opacity": 0.85,
            ...(dash ? { "line-dasharray": dash } : {}),
          },
        })
      }
    }
    if (map.isStyleLoaded()) apply()
    else map.once("load", apply)
  }, [routePolyline, pickup, destination])

  // Live driver marker — a vehicle icon when the type is known, else a dot.
  const driverIconRef = useRef<string | null>(null)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!driverPosition) {
      driverMarker.current?.remove()
      driverMarker.current = null
      driverIconRef.current = null
      return
    }
    const iconKey = driverVehicle ?? "dot"
    // Recreate the element if the icon kind changed (e.g. dot → bike)
    if (driverMarker.current && driverIconRef.current !== iconKey) {
      driverMarker.current.remove()
      driverMarker.current = null
    }
    if (!driverMarker.current) {
      driverIconRef.current = iconKey
      const element = driverVehicle ? makeVehicleMarker(driverVehicle) : makeDriverDot()
      driverMarker.current = new maplibregl.Marker({ element })
        .setLngLat(driverPosition)
        .addTo(map)
    } else {
      driverMarker.current.setLngLat(driverPosition)
    }
  }, [driverPosition, driverVehicle])

  return (
    <div className={className ?? "h-full w-full"}>
      <div ref={containerRef} className="h-full w-full" />
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 p-6 text-center">
          <p className="text-sm text-gray-600">{failed}</p>
        </div>
      )}
    </div>
  )
}
