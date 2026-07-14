"use client"
import { useState } from "react"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Users,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Car,
  Phone,
  Mail,
  Calendar,
  Star,
  DollarSign,
  MapPin,
} from "lucide-react"

export default function DriversPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedDriver, setSelectedDriver] = useState<any>(null)

  const drivers = [
    {
      id: "D001",
      name: "John Smith",
      email: "john.smith@email.com",
      phone: "+1 555-0123",
      status: "active",
      rating: 4.9,
      totalRides: 1247,
      earnings: 15420,
      vehicle: "2020 Toyota Camry",
      license: "DL123456789",
      joinDate: "2023-06-15",
      lastActive: "2 min ago",
      location: "Downtown",
      documents: {
        license: "verified",
        insurance: "verified",
        background: "verified",
      },
    },
    {
      id: "D002",
      name: "Sarah Johnson",
      email: "sarah.j@email.com",
      phone: "+1 555-0124",
      status: "active",
      rating: 4.8,
      totalRides: 892,
      earnings: 12350,
      vehicle: "2019 Honda Accord",
      license: "DL987654321",
      joinDate: "2023-08-22",
      lastActive: "5 min ago",
      location: "Uptown",
      documents: {
        license: "verified",
        insurance: "verified",
        background: "verified",
      },
    },
    {
      id: "D003",
      name: "Mike Chen",
      email: "mike.chen@email.com",
      phone: "+1 555-0125",
      status: "pending",
      rating: 0,
      totalRides: 0,
      earnings: 0,
      vehicle: "2021 Nissan Altima",
      license: "DL456789123",
      joinDate: "2024-01-15",
      lastActive: "Never",
      location: "N/A",
      documents: {
        license: "pending",
        insurance: "verified",
        background: "pending",
      },
    },
    {
      id: "D004",
      name: "Emily Davis",
      email: "emily.d@email.com",
      phone: "+1 555-0126",
      status: "suspended",
      rating: 4.2,
      totalRides: 234,
      earnings: 3420,
      vehicle: "2018 Ford Focus",
      license: "DL789123456",
      joinDate: "2023-11-10",
      lastActive: "2 days ago",
      location: "Midtown",
      documents: {
        license: "verified",
        insurance: "expired",
        background: "verified",
      },
    },
    {
      id: "D005",
      name: "David Wilson",
      email: "david.w@email.com",
      phone: "+1 555-0127",
      status: "active",
      rating: 4.7,
      totalRides: 567,
      earnings: 8750,
      vehicle: "2020 Hyundai Elantra",
      license: "DL321654987",
      joinDate: "2023-09-05",
      lastActive: "1 hour ago",
      location: "Airport Area",
      documents: {
        license: "verified",
        insurance: "verified",
        background: "verified",
      },
    },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Pending</Badge>
      case "suspended":
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Suspended</Badge>
      case "inactive":
        return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Inactive</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getDocumentBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">Verified</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 text-xs">Pending</Badge>
      case "expired":
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-xs">Expired</Badge>
      default:
        return (
          <Badge variant="secondary" className="text-xs">
            {status}
          </Badge>
        )
    }
  }

  const filteredDrivers = drivers.filter((driver) => {
    const matchesSearch =
      driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.phone.includes(searchTerm)
    const matchesStatus = statusFilter === "all" || driver.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Driver Management</h1>
          <p className="text-gray-600 mt-1">Manage and monitor all RideX drivers</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Users className="w-4 h-4 mr-2" />
            Add Driver
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Drivers</p>
                <p className="text-2xl font-bold text-gray-900">{drivers.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {drivers.filter((d) => d.status === "active").length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {drivers.filter((d) => d.status === "pending").length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Suspended</p>
                <p className="text-2xl font-bold text-red-600">
                  {drivers.filter((d) => d.status === "suspended").length}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search drivers by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drivers Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Drivers ({filteredDrivers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredDrivers.map((driver) => (
              <div key={driver.id} className="p-6 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {driver.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">{driver.name}</h3>
                      <p className="text-gray-600">ID: {driver.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(driver.status)}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setSelectedDriver(driver)}>
                          <Eye className="w-4 h-4 mr-1" />
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Driver Details - {selectedDriver?.name}</DialogTitle>
                          <DialogDescription>Complete information and statistics for this driver</DialogDescription>
                        </DialogHeader>
                        {selectedDriver && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Personal Information */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg">Personal Information</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="flex items-center space-x-3">
                                  <Mail className="w-4 h-4 text-gray-500" />
                                  <span>{selectedDriver.email}</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <Phone className="w-4 h-4 text-gray-500" />
                                  <span>{selectedDriver.phone}</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <Calendar className="w-4 h-4 text-gray-500" />
                                  <span>Joined {selectedDriver.joinDate}</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <MapPin className="w-4 h-4 text-gray-500" />
                                  <span>Last seen: {selectedDriver.location}</span>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Vehicle Information */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg">Vehicle Information</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="flex items-center space-x-3">
                                  <Car className="w-4 h-4 text-gray-500" />
                                  <span>{selectedDriver.vehicle}</span>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">License: {selectedDriver.license}</p>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Statistics */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg">Statistics</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center space-x-2">
                                    <Star className="w-4 h-4 text-yellow-500" />
                                    <span>Rating</span>
                                  </span>
                                  <span className="font-semibold">{selectedDriver.rating}/5.0</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Total Rides</span>
                                  <span className="font-semibold">{selectedDriver.totalRides}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center space-x-2">
                                    <DollarSign className="w-4 h-4 text-green-500" />
                                    <span>Earnings</span>
                                  </span>
                                  <span className="font-semibold">${selectedDriver.earnings}</span>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Documents */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg">Documents</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <span>Driver's License</span>
                                  {getDocumentBadge(selectedDriver.documents.license)}
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Insurance</span>
                                  {getDocumentBadge(selectedDriver.documents.insurance)}
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Background Check</span>
                                  {getDocumentBadge(selectedDriver.documents.background)}
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                    <Button variant="outline" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Email</p>
                    <p className="font-medium">{driver.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Phone</p>
                    <p className="font-medium">{driver.phone}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Rating</p>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="font-medium">{driver.rating}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Rides</p>
                    <p className="font-medium">{driver.totalRides}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    <span>Vehicle: {driver.vehicle}</span>
                    <span className="mx-2">•</span>
                    <span>Last active: {driver.lastActive}</span>
                  </div>
                  <div className="flex space-x-2">
                    {driver.status === "pending" && (
                      <>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50 bg-transparent"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    {driver.status === "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-orange-600 border-orange-200 hover:bg-orange-50 bg-transparent"
                      >
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        Suspend
                      </Button>
                    )}
                    {driver.status === "suspended" && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Reactivate
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
