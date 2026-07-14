"use client"
import { useEffect, useRef, useState } from "react"
import { Bike, Car, Crown } from "lucide-react"

export interface RouteTicketProps {
  from: string
  fromNote?: string
  to: string
  toNote?: string
  rideType?: "bike" | "car" | "premium"
  distanceKm?: number
  durationMin?: number
  /** Fare in NPR. */
  fare: number
  /** Count the fare up on mount (respects reduced-motion). */
  animateFare?: boolean
  driverName?: string
  plate?: string
  status?: string
  className?: string
}

const RIDE_ICON = { bike: Bike, car: Car, premium: Crown }

/**
 * The RideX signature: a fare rendered like a printed cash receipt / taxi meter.
 * Landmark-first stops, tabular-mono numbers, a dashed route spine — the things
 * that are actually true about riding in Kathmandu (cash, landmarks, a meter).
 */
export function RouteTicket({
  from,
  fromNote,
  to,
  toNote,
  rideType = "bike",
  distanceKm,
  durationMin,
  fare,
  animateFare = false,
  driverName,
  plate,
  status,
  className = "",
}: RouteTicketProps) {
  const Icon = RIDE_ICON[rideType]
  // Only the animated count lives in state; the static case renders `fare` directly
  // so no setState happens synchronously in an effect (react-hooks v7).
  const [animated, setAnimated] = useState(0)
  const raf = useRef<number | null>(null)

  useEffect(() => {
    if (!animateFare) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) {
      const id = requestAnimationFrame(() => setAnimated(fare))
      return () => cancelAnimationFrame(id)
    }
    const start = performance.now()
    const dur = 900
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setAnimated(Math.round(fare * eased))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [fare, animateFare])

  const shown = animateFare ? animated : fare

  return (
    <div
      className={`relative w-full max-w-sm rounded-2xl bg-white text-ink shadow-[0_24px_70px_-24px_rgba(12,16,36,0.55)] ${className}`}
    >
      {/* perforated top edge */}
      <div className="flex items-center justify-between px-6 pt-5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          RideX · Ticket
        </span>
        <span className="tnum text-[11px] text-muted-foreground">NPR</span>
      </div>

      <div className="px-6 pb-5 pt-4">
        {/* route spine */}
        <div className="relative pl-6">
          <span className="absolute left-[6px] top-2 h-2.5 w-2.5 rounded-full bg-crimson ring-4 ring-crimson/15" />
          <span
            className="absolute left-[10px] top-4 bottom-4 w-px border-l-2 border-dashed border-ink/25"
            aria-hidden
          />
          <span className="absolute left-[6px] bottom-2 h-2.5 w-2.5 rounded-sm bg-midnight ring-4 ring-midnight/10" />

          <div className="pb-4">
            <p className="text-sm font-semibold leading-tight">{from}</p>
            {fromNote && <p className="text-xs text-muted-foreground">{fromNote}</p>}
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">{to}</p>
            {toNote && <p className="text-xs text-muted-foreground">{toNote}</p>}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-dashed border-ink/15 pt-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-paper-2 px-2.5 py-1 font-medium capitalize text-ink">
            <Icon className="h-3.5 w-3.5" />
            {rideType}
          </span>
          {distanceKm != null && <span className="tnum">{distanceKm.toFixed(1)} km</span>}
          {durationMin != null && <span className="tnum">· {durationMin} min</span>}
        </div>

        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Fare</p>
            <p className="tnum text-3xl font-bold text-ink">
              <span className="text-lg text-muted-foreground">रु</span> {shown.toLocaleString("en-IN")}
            </p>
          </div>
          {status && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-jade/12 px-2.5 py-1 text-xs font-medium text-jade">
              <span className="h-1.5 w-1.5 rounded-full bg-jade" />
              {status}
            </span>
          )}
        </div>

        {(driverName || plate) && (
          <div className="mt-4 flex items-center justify-between rounded-xl bg-paper px-3 py-2.5 text-xs">
            <span className="font-medium text-ink">{driverName ?? "Driver assigned"}</span>
            {plate && <span className="tnum rounded bg-midnight px-2 py-0.5 text-marigold">{plate}</span>}
          </div>
        )}
      </div>

      {/* torn/barcode footer */}
      <div className="flex items-center gap-[3px] overflow-hidden rounded-b-2xl bg-midnight px-6 py-3">
        {Array.from({ length: 44 }).map((_, i) => (
          <span
            key={i}
            className="h-4 w-px bg-white/35"
            style={{ opacity: i % 3 === 0 ? 0.7 : i % 2 === 0 ? 0.3 : 0.5 }}
          />
        ))}
      </div>
    </div>
  )
}
