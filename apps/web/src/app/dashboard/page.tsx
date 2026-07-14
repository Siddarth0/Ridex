"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import api, { isUnauthorized } from "@/lib/api"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { AppHeader } from "@/components/brand/app-header"
import { ArrowRight, Bike, Car, MapPin, Navigation, Star } from "lucide-react"

interface Me {
  firstName: string
  lastName: string
  email: string
  role: string
}

interface RideRow {
  id: string
  status: string
  rideType: "bike" | "car" | "premium"
  pickup: { address: string }
  destination: { address: string }
  finalFare: number | null
  estimatedFare: number | null
  currency: string
  requestedAt: string
}

const statusTone: Record<string, string> = {
  completed: "text-jade",
  cancelled: "text-crimson",
  expired: "text-muted-foreground",
}

export default function DashboardPage() {
  const router = useRouter()
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeRide, setActiveRide] = useState<{ id: string; status: string } | null>(null)
  const [rides, setRides] = useState<RideRow[]>([])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await api.get("/auth/me")
        if (cancelled) return
        setMe(res.data?.data?.user ?? null)
      } catch (error) {
        if (!cancelled && isUnauthorized(error)) {
          toast.error("Please sign in to continue.")
          router.push("/login")
        }
        if (!cancelled) setLoading(false)
        return
      }
      try {
        const [active, history] = await Promise.all([
          api.get("/rides/active"),
          api.get("/rides", { params: { limit: 6 } }),
        ])
        if (!cancelled) {
          setActiveRide(active.data?.data?.ride ?? null)
          setRides(history.data?.data?.rides ?? [])
        }
      } catch {
        /* non-critical */
      }
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
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
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <p className="tnum text-sm text-muted-foreground">loading…</p>
      </div>
    )
  }
  if (!me) return null

  const completed = rides.filter((r) => r.status === "completed").length
  const spent = rides
    .filter((r) => r.status === "completed")
    .reduce((s, r) => s + (r.finalFare ?? 0), 0)

  return (
    <div className="min-h-screen bg-paper">
      <AppHeader role={me.role} onSignOut={handleLogout} />

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
        <div>
          <p className="font-deva text-sm text-crimson">नमस्ते, {me.firstName}</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-ink">
            Where to today?
          </h1>
        </div>

        {activeRide && (
          <Link
            href="/book-ride"
            className="flex items-center justify-between rounded-2xl border border-crimson/30 bg-crimson/5 px-5 py-4 transition-colors hover:bg-crimson/10"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-crimson text-white">
                <Navigation className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink">A ride is in progress</span>
                <span className="block text-xs capitalize text-muted-foreground">{activeRide.status} — tap to track live</span>
              </span>
            </span>
            <ArrowRight className="h-5 w-5 text-crimson" />
          </Link>
        )}

        {/* Book-a-ride panel */}
        <div className="relative overflow-hidden rounded-3xl bg-midnight bg-contours p-8 text-white">
          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-md">
              <h2 className="font-display text-2xl font-bold">Book a bike or car</h2>
              <p className="mt-2 text-white/70">
                Drop a pin or name a landmark. See the fare in NPR before you confirm — no surprises.
              </p>
            </div>
            <Link href="/book-ride">
              <Button size="lg" className="h-13 bg-crimson px-7 text-base text-white hover:bg-crimson-ink">
                <MapPin className="mr-2 h-5 w-5" />
                Start a ride
              </Button>
            </Link>
          </div>
        </div>

        {/* Honest stat strip */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Rides taken", value: String(completed), sub: "completed with RideX", icon: Car },
            { label: "Spent", value: `रु ${spent.toLocaleString("en-IN")}`, sub: "on recent rides", icon: Bike },
            { label: "Your rating", value: "New", sub: "riders rate you too", icon: Star },
          ].map(({ label, value, sub, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
                <Icon className="h-4 w-4 text-crimson" />
              </div>
              <p className="tnum mt-3 text-3xl font-bold text-ink">{value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
            </div>
          ))}
        </div>

        {/* Recent rides */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-ink">Recent rides</h2>
          </div>
          {rides.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <p className="text-sm text-muted-foreground">No rides yet — your trips will show up here.</p>
              <Link href="/book-ride" className="mt-3 inline-block text-sm font-semibold text-crimson hover:underline">
                Book your first ride →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {rides.map((r) => {
                const Icon = r.rideType === "bike" ? Bike : Car
                return (
                  <div key={r.id} className="flex items-center gap-4 px-5 py-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-paper-2 text-ink">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">
                        {r.pickup.address} → {r.destination.address}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.requestedAt).toLocaleDateString()} ·{" "}
                        <span className={`capitalize ${statusTone[r.status] ?? "text-muted-foreground"}`}>
                          {r.status.replace("_", " ")}
                        </span>
                      </p>
                    </div>
                    <span className="tnum shrink-0 text-sm font-semibold text-ink">
                      रु {(r.finalFare ?? r.estimatedFare ?? 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
