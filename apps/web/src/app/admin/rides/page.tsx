"use client"
import { useEffect, useState } from "react"
import api, { getApiErrorMessage } from "@/lib/api"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Car, Search, Eye, Clock, MapPin, Phone, XCircle, AlertTriangle } from "lucide-react"

interface AdminRide {
  id: string
  status: string
  rideType: string
  pickupAddress: string
  destinationAddress: string
  estimatedFare: number | null
  finalFare: number | null
  currency: string
  requestedAt: string
  completedAt: string | null
  cancelledAt: string | null
  cancelledBy: string | null
  rider: { id: string; name: string; phone: string }
  driver: { id: string; name: string; phone: string } | null
}

const ACTIVE = ["searching", "accepted", "arrived", "in_progress"]

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    searching: "bg-blue-100 text-blue-700",
    accepted: "bg-indigo-100 text-indigo-700",
    arrived: "bg-violet-100 text-violet-700",
    in_progress: "bg-jade/12 text-jade",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
    expired: "bg-gray-100 text-gray-700",
  }
  return <Badge className={`${map[status] ?? "bg-gray-100 text-gray-700"} hover:opacity-100`}>{status}</Badge>
}

const money = (v: number | null, currency: string) => (v == null ? "—" : `${currency} ${v.toFixed(2)}`)

export default function RidesPage() {
  const [rides, setRides] = useState<AdminRide[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<AdminRide | null>(null)
  const [cancelReason, setCancelReason] = useState("")
  const [acting, setActing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    const params: Record<string, string | number> = { limit: 100 }
    if (statusFilter !== "all") params.status = statusFilter
    if (query) params.q = query
    api
      .get("/admin/rides", { params })
      .then((res) => {
        if (cancelled) return
        setRides(res.data.data.rides)
        setTotal(res.data.data.total)
      })
      .catch((error) => {
        if (!cancelled) toast.error(getApiErrorMessage(error, "Failed to load rides"))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [statusFilter, query, refreshKey])

  const forceCancel = async () => {
    if (!selected) return
    try {
      setActing(true)
      await api.post(`/admin/rides/${selected.id}/force-cancel`, { reason: cancelReason.trim() })
      toast.success("Ride force-cancelled")
      setSelected(null)
      setCancelReason("")
      setRefreshKey((k) => k + 1)
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to cancel ride"))
    } finally {
      setActing(false)
    }
  }

  const activeCount = rides.filter((r) => ACTIVE.includes(r.status)).length
  const completedCount = rides.filter((r) => r.status === "completed").length

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Rides</h1>
        <p className="text-gray-600 mt-1">Monitor live and historical rides across RideX</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Total (page)", value: total, icon: Car, color: "text-blue-600" },
          { label: "Active now", value: activeCount, icon: Clock, color: "text-crimson" },
          { label: "Completed (page)", value: completedCount, icon: MapPin, color: "text-green-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{label}</p>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                </div>
                <Icon className={`w-8 h-8 ${color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <form
              className="flex-1"
              onSubmit={(e) => {
                e.preventDefault()
                setLoading(true)
                setQuery(search.trim())
              }}
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by ride id or address, then press Enter…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </form>
            <div className="w-full md:w-48">
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setLoading(true)
                  setStatusFilter(value)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="searching">Searching</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="arrived">Arrived</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Rides ({rides.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500 py-8 text-center">Loading rides…</p>
          ) : rides.length === 0 ? (
            <p className="text-gray-500 py-8 text-center">No rides found.</p>
          ) : (
            <div className="space-y-3">
              {rides.map((ride) => (
                <div key={ride.id} className="p-4 bg-gray-50 rounded-lg flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      {statusBadge(ride.status)}
                      <span className="text-xs text-gray-400 font-mono">{ride.id.slice(0, 8)}</span>
                      <Badge variant="secondary">{ride.rideType}</Badge>
                    </div>
                    <p className="text-sm text-gray-900 mt-1.5 truncate">
                      {ride.pickupAddress} → {ride.destinationAddress}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {ride.rider.name} · {ride.driver ? ride.driver.name : "no driver"} ·{" "}
                      {new Date(ride.requestedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold text-gray-900">
                      {money(ride.finalFare ?? ride.estimatedFare, ride.currency)}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => setSelected(ride)}>
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Ride {selected.id.slice(0, 8)} {statusBadge(selected.status)}
                </DialogTitle>
                <DialogDescription>
                  Requested {new Date(selected.requestedAt).toLocaleString()}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500">Route</p>
                  <p className="text-gray-900">{selected.pickupAddress}</p>
                  <p className="text-gray-900">→ {selected.destinationAddress}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-gray-500">Rider</p>
                    <p className="text-gray-900">{selected.rider.name}</p>
                    <p className="text-gray-600 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {selected.rider.phone}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Driver</p>
                    <p className="text-gray-900">{selected.driver?.name ?? "—"}</p>
                    {selected.driver && (
                      <p className="text-gray-600 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {selected.driver.phone}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-gray-500">Estimated</p>
                    <p className="text-gray-900">{money(selected.estimatedFare, selected.currency)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Final</p>
                    <p className="text-gray-900">{money(selected.finalFare, selected.currency)}</p>
                  </div>
                </div>
                {selected.cancelledBy && (
                  <p className="text-red-600">Cancelled by {selected.cancelledBy}</p>
                )}

                {ACTIVE.includes(selected.status) && (
                  <div className="space-y-3 border-t pt-4">
                    <div className="flex items-center gap-2 text-amber-600 text-xs">
                      <AlertTriangle className="w-4 h-4" />
                      Force-cancelling ends the ride immediately and notifies both parties.
                    </div>
                    <Input
                      placeholder="Reason (required)"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                    />
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        disabled={acting || cancelReason.trim().length === 0}
                        onClick={forceCancel}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Force cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
