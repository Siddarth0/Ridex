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
import {
  Users,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Car,
  Phone,
  Mail,
  Star,
  FileText,
} from "lucide-react"

interface AdminDriver {
  id: string
  licenseNumber: string
  status: "pending" | "approved" | "rejected" | "suspended"
  rejectionReason: string | null
  isOnline: boolean
  ratingAvg: number | null
  ratingCount: number
  createdAt: string
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string
    emailVerifiedAt: string | null
  }
}

interface DriverDetail extends AdminDriver {
  vehicles: {
    id: string
    rideType: string
    make: string
    model: string
    year: number | null
    plateNumber: string
    color: string | null
  }[]
  documents: {
    id: string
    type: string
    status: string
    originalName: string | null
    createdAt: string
  }[]
}

const statusBadge = (status: string) => {
  switch (status) {
    case "approved":
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Approved</Badge>
    case "pending":
      return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Pending</Badge>
    case "rejected":
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Rejected</Badge>
    case "suspended":
      return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Suspended</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<AdminDriver[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selected, setSelected] = useState<DriverDetail | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [acting, setActing] = useState(false)

  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    const params = statusFilter === "all" ? {} : { status: statusFilter }
    api
      .get("/admin/drivers", { params: { ...params, limit: 100 } })
      .then((res) => {
        if (cancelled) return
        setDrivers(res.data.data.drivers)
        setTotal(res.data.data.total)
      })
      .catch((error) => {
        if (!cancelled) toast.error(getApiErrorMessage(error, "Failed to load drivers"))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [statusFilter, refreshKey])

  const openDetail = async (id: string) => {
    try {
      const res = await api.get(`/admin/drivers/${id}`)
      const d = res.data.data.driver
      setSelected({ ...d, user: d.user })
      setRejectReason("")
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to load driver"))
    }
  }

  const act = async (id: string, action: "approve" | "reject") => {
    try {
      setActing(true)
      await api.post(
        `/admin/drivers/${id}/${action}`,
        action === "reject" ? { reason: rejectReason } : {},
      )
      toast.success(action === "approve" ? "Driver approved ✅" : "Driver rejected")
      setSelected(null)
      setRefreshKey((k) => k + 1)
    } catch (error) {
      toast.error(getApiErrorMessage(error, `Failed to ${action} driver`))
    } finally {
      setActing(false)
    }
  }

  const filtered = drivers.filter((d) => {
    const q = searchTerm.toLowerCase()
    return (
      `${d.user.firstName} ${d.user.lastName}`.toLowerCase().includes(q) ||
      d.user.email.toLowerCase().includes(q) ||
      d.user.phone.includes(searchTerm) ||
      d.licenseNumber.toLowerCase().includes(q)
    )
  })

  const countBy = (status: string) => drivers.filter((d) => d.status === status).length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Driver Management</h1>
          <p className="text-gray-600 mt-1">Review applications and manage RideX drivers</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Total Drivers", value: total, icon: Users, color: "text-blue-600" },
          { label: "Approved", value: countBy("approved"), icon: CheckCircle, color: "text-green-600" },
          { label: "Pending Review", value: countBy("pending"), icon: AlertTriangle, color: "text-yellow-600" },
          { label: "Rejected", value: countBy("rejected"), icon: XCircle, color: "text-red-600" },
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

      {/* Filters */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, phone, or license..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
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
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drivers list */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Drivers ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500 py-8 text-center">Loading drivers…</p>
          ) : filtered.length === 0 ? (
            <p className="text-gray-500 py-8 text-center">No drivers found.</p>
          ) : (
            <div className="space-y-4">
              {filtered.map((driver) => (
                <div key={driver.id} className="p-6 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold">
                          {driver.user.firstName[0]}
                          {driver.user.lastName[0]}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold text-gray-900">
                            {driver.user.firstName} {driver.user.lastName}
                          </h3>
                          {statusBadge(driver.status)}
                          {driver.isOnline && (
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Online</Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                          <span className="flex items-center">
                            <Mail className="w-3.5 h-3.5 mr-1" />
                            {driver.user.email}
                          </span>
                          <span className="flex items-center">
                            <Phone className="w-3.5 h-3.5 mr-1" />
                            {driver.user.phone}
                          </span>
                          <span className="flex items-center">
                            <Star className="w-3.5 h-3.5 mr-1 text-yellow-500" />
                            {driver.ratingAvg ?? "New"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openDetail(driver.id)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Review
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail / review dialog */}
      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selected.user.firstName} {selected.user.lastName}
                </DialogTitle>
                <DialogDescription>
                  Application from {new Date(selected.createdAt).toLocaleDateString()} — license{" "}
                  {selected.licenseNumber}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">{statusBadge(selected.status)}</div>

                {selected.rejectionReason && (
                  <p className="text-sm text-red-600">Rejected: {selected.rejectionReason}</p>
                )}

                <div>
                  <h4 className="font-semibold text-sm text-gray-900 mb-2 flex items-center">
                    <Car className="w-4 h-4 mr-2" />
                    Vehicles
                  </h4>
                  {selected.vehicles.map((v) => (
                    <p key={v.id} className="text-sm text-gray-600">
                      {v.year ?? ""} {v.make} {v.model} — {v.plateNumber} ({v.rideType}
                      {v.color ? `, ${v.color}` : ""})
                    </p>
                  ))}
                </div>

                <div>
                  <h4 className="font-semibold text-sm text-gray-900 mb-2 flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    Documents ({selected.documents.length})
                  </h4>
                  {selected.documents.length === 0 ? (
                    <p className="text-sm text-gray-500">No documents uploaded yet.</p>
                  ) : (
                    <ul className="space-y-1">
                      {selected.documents.map((doc) => (
                        <li key={doc.id} className="text-sm text-gray-600 flex items-center justify-between">
                          <span>
                            {doc.type} — {doc.originalName ?? "file"}
                          </span>
                          <a
                            className="text-emerald-600 hover:underline"
                            href={`/api/admin/drivers/${selected.id}/documents/${doc.id}/download`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {selected.status === "pending" && (
                  <div className="space-y-3 border-t pt-4">
                    <Input
                      placeholder="Rejection reason (required to reject)"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <div className="flex items-center justify-end space-x-3">
                      <Button
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        disabled={acting || rejectReason.trim().length === 0}
                        onClick={() => act(selected.id, "reject")}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700"
                        disabled={acting}
                        onClick={() => act(selected.id, "approve")}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
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
