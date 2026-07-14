"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import api, { getApiErrorMessage } from "@/lib/api"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Users,
  Car,
  Radio,
  UserCheck,
  MapPin,
  ArrowRight,
  Clock,
} from "lucide-react"

interface PendingDriver {
  id: string
  licenseNumber: string
  createdAt: string
  user: { firstName: string; lastName: string; email: string }
}
interface RecentRide {
  id: string
  status: string
  rideType: string
  pickupAddress: string
  destinationAddress: string
  finalFare: number | null
  estimatedFare: number | null
  currency: string
  requestedAt: string
  rider: { name: string }
  driver: { name: string } | null
}

const statusTone: Record<string, string> = {
  completed: "text-jade",
  cancelled: "text-crimson",
  expired: "text-muted-foreground",
  searching: "text-marigold",
  accepted: "text-ink",
  arrived: "text-ink",
  in_progress: "text-jade",
}

export default function AdminDashboard() {
  const [counts, setCounts] = useState({ online: 0, active: 0, pending: 0, drivers: 0 })
  const [pending, setPending] = useState<PendingDriver[]>([])
  const [recent, setRecent] = useState<RecentRide[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [overview, pendingRes, allDrivers, rides] = await Promise.all([
          api.get("/admin/overview"),
          api.get("/admin/drivers", { params: { status: "pending", limit: 5 } }),
          api.get("/admin/drivers", { params: { limit: 1 } }),
          api.get("/admin/rides", { params: { limit: 6 } }),
        ])
        if (cancelled) return
        setCounts({
          online: overview.data.data.counts.onlineDrivers,
          active: overview.data.data.counts.activeRides,
          pending: pendingRes.data.data.total,
          drivers: allDrivers.data.data.total,
        })
        setPending(pendingRes.data.data.drivers)
        setRecent(rides.data.data.rides)
      } catch (error) {
        if (!cancelled) toast.error(getApiErrorMessage(error, "Failed to load dashboard"))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const tiles = [
    { label: "Drivers online", value: counts.online, icon: Radio, href: "/admin/locations", tone: "jade" as const },
    { label: "Active rides", value: counts.active, icon: Car, href: "/admin/rides", tone: "crimson" as const },
    { label: "Pending KYC", value: counts.pending, icon: UserCheck, href: "/admin/drivers", tone: "marigold" as const },
    { label: "Total drivers", value: counts.drivers, icon: Users, href: "/admin/drivers", tone: "ink" as const },
  ]
  const toneBg = { jade: "bg-jade", crimson: "bg-crimson", marigold: "bg-marigold", ink: "bg-midnight" }
  const money = (r: RecentRide) =>
    `रु ${(r.finalFare ?? r.estimatedFare ?? 0).toLocaleString("en-IN")}`

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-deva text-sm text-crimson">नियन्त्रण कक्ष</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-ink">Operations</h1>
          <p className="mt-1 text-muted-foreground">Live view of the RideX fleet across the valley.</p>
        </div>
        <Link href="/admin/locations">
          <Button className="bg-crimson text-white hover:bg-crimson-ink">
            <MapPin className="mr-2 h-4 w-4" />
            Open live map
          </Button>
        </Link>
      </div>

      {/* Real metric tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map(({ label, value, icon: Icon, href, tone }) => (
          <Link
            key={label}
            href={href}
            className="group rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneBg[tone]} text-white`}>
                <Icon className="h-5 w-5" />
              </span>
              <ArrowRight className="h-4 w-4 text-border transition-colors group-hover:text-crimson" />
            </div>
            <p className="tnum mt-4 text-4xl font-bold text-ink">{loading ? "—" : value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent rides */}
        <div className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="font-display text-lg font-bold text-ink">Recent rides</h2>
            <Link href="/admin/rides" className="text-sm font-medium text-crimson hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-border">
            {loading ? (
              <p className="px-6 py-10 text-center text-sm text-muted-foreground">Loading…</p>
            ) : recent.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-muted-foreground">No rides yet.</p>
            ) : (
              recent.map((r) => (
                <div key={r.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {r.pickupAddress} → {r.destinationAddress}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.rider.name} · {r.driver?.name ?? "no driver"} ·{" "}
                      <span className={`capitalize ${statusTone[r.status] ?? "text-muted-foreground"}`}>
                        {r.status.replace("_", " ")}
                      </span>
                    </p>
                  </div>
                  <span className="tnum shrink-0 text-sm font-semibold text-ink">{money(r)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending KYC */}
        <div className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="font-display text-lg font-bold text-ink">Awaiting KYC review</h2>
            <Link href="/admin/drivers" className="text-sm font-medium text-crimson hover:underline">
              Review queue
            </Link>
          </div>
          <div className="divide-y divide-border">
            {loading ? (
              <p className="px-6 py-10 text-center text-sm text-muted-foreground">Loading…</p>
            ) : pending.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                Nothing pending — the queue is clear. 🎉
              </p>
            ) : (
              pending.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-marigold/15 font-display text-xs font-bold text-ink">
                      {d.user.firstName[0]}
                      {d.user.lastName[0]}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {d.user.firstName} {d.user.lastName}
                      </p>
                      <p className="tnum text-xs text-muted-foreground">{d.licenseNumber}</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(d.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
