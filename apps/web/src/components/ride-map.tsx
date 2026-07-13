"use client"
import { useEffect, useRef, useState } from "react"
import maplibregl, { Map as MlMap, Marker } from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { decodePolyline } from "@/lib/polyline"

// Free, keyless OSM style; swap via NEXT_PUBLIC_MAP_STYLE_URL if desired
const MAP_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? "https://tiles.openfreemap.org/styles/liberty"

const KATHMANDU: [number, number] = [85.3123, 27.7154]

export interface RideMapProps {
  pickup: [number, number] | null
  destination: [number, number] | null
  /** Fired when the user drags a pin or clicks the map in a placement mode. */
  onPlace?: (kind: "pickup" | "destination", coords: [number, number]) => void
  /** Which pin a map click places; null disables click placement. */
  placing?: "pickup" | "destination" | null
  routePolyline?: string | null
  driverPosition?: [number, number] | null
  /** Where to center the map before any pins exist (e.g. the user's GPS). */
  focus?: [number, number] | null
  className?: string
}

function makePin(color: string): HTMLDivElement {
  const el = document.createElement("div")
  el.style.cssText = `width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
    background:${color};border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35);cursor:grab;`
  return el
}

function makeDriverDot(): HTMLDivElement {
  const el = document.createElement("div")
  el.style.cssText = `width:16px;height:16px;border-radius:50%;background:#059669;
    border:3px solid white;box-shadow:0 0 0 6px rgba(5,150,105,.25);`
  return el
}

export function RideMap({
  pickup,
  destination,
  onPlace,
  placing = null,
  routePolyline,
  driverPosition,
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

    if (pickup && destination) {
      const bounds = new maplibregl.LngLatBounds(pickup, pickup).extend(destination)
      map.fitBounds(bounds, { padding: 80, maxZoom: 15 })
    } else if (pickup) {
      map.easeTo({ center: pickup, zoom: 14 })
    }
  }, [pickup, destination])

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

  // Live driver marker
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!driverPosition) {
      driverMarker.current?.remove()
      driverMarker.current = null
      return
    }
    if (!driverMarker.current) {
      driverMarker.current = new maplibregl.Marker({ element: makeDriverDot() })
        .setLngLat(driverPosition)
        .addTo(map)
    } else {
      driverMarker.current.setLngLat(driverPosition)
    }
  }, [driverPosition])

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
