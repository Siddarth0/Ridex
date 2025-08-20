"use client"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Users,
  Car,
  DollarSign,
  TrendingUp,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  MoreHorizontal,
} from "lucide-react"

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalDrivers: 1247,
    activeDrivers: 892,
    totalRides: 15634,
    todayRides: 234,
    revenue: 125430,
    todayRevenue: 8750,
    avgRating: 4.8,
    pendingApprovals: 23,
  })

  const recentRides = [
    {
      id: "R001",
      driver: "John Smith",
      rider: "Sarah Johnson",
      from: "Downtown",
      to: "Airport",
      status: "completed",
      amount: 28.5,
      time: "2 min ago",
    },
    {
      id: "R002",
      driver: "Mike Chen",
      rider: "Emily Davis",
      from: "Mall",
      to: "University",
      status: "in_progress",
      amount: 15.75,
      time: "5 min ago",
    },
    {
      id: "R003",
      driver: "David Wilson",
      rider: "Alex Brown",
      from: "Hotel",
      to: "Conference Center",
      status: "cancelled",
      amount: 22.0,
      time: "8 min ago",
    },
    {
      id: "R004",
      driver: "Lisa Garcia",
      rider: "Tom Wilson",
      from: "Restaurant",
      to: "Home",
      status: "completed",
      amount: 18.25,
      time: "12 min ago",
    },
  ]

  const pendingDrivers = [
    {
      id: "D001",
      name: "Robert Taylor",
      email: "robert.t@email.com",
      phone: "+1 555-0123",
      vehicle: "2020 Toyota Camry",
      appliedDate: "2024-01-15",
      status: "pending_review",
    },
    {
      id: "D002",
      name: "Jennifer Lee",
      email: "jennifer.l@email.com",
      phone: "+1 555-0124",
      vehicle: "2019 Honda Accord",
      appliedDate: "2024-01-14",
      status: "background_check",
    },
    {
      id: "D003",
      name: "Michael Brown",
      email: "michael.b@email.com",
      phone: "+1 555-0125",
      vehicle: "2021 Nissan Altima",
      appliedDate: "2024-01-13",
      status: "vehicle_inspection",
    },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Completed</Badge>
      case "in_progress":
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">In Progress</Badge>
      case "cancelled":
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Cancelled</Badge>
      case "pending_review":
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Pending Review</Badge>
      case "background_check":
        return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">Background Check</Badge>
      case "vehicle_inspection":
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Vehicle Inspection</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with RideX today.</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <TrendingUp className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Eye className="w-4 h-4 mr-2" />
            Live Map
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Drivers</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalDrivers.toLocaleString()}</p>
                <p className="text-sm text-green-600 mt-1">
                  <TrendingUp className="w-4 h-4 inline mr-1" />
                  +12% from last month
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Now</p>
                <p className="text-3xl font-bold text-gray-900">{stats.activeDrivers.toLocaleString()}</p>
                <p className="text-sm text-green-600 mt-1">
                  <CheckCircle className="w-4 h-4 inline mr-1" />
                  {Math.round((stats.activeDrivers / stats.totalDrivers) * 100)}% online
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Car className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900">${stats.revenue.toLocaleString()}</p>
                <p className="text-sm text-green-600 mt-1">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  +${stats.todayRevenue.toLocaleString()} today
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
                <p className="text-3xl font-bold text-gray-900">{stats.pendingApprovals}</p>
                <p className="text-sm text-orange-600 mt-1">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Requires attention
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Rides */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold">Recent Rides</CardTitle>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentRides.map((ride) => (
                <div key={ride.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="font-semibold text-gray-900">#{ride.id}</span>
                      {getStatusBadge(ride.status)}
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>
                        <strong>Driver:</strong> {ride.driver}
                      </p>
                      <p>
                        <strong>Rider:</strong> {ride.rider}
                      </p>
                      <div className="flex items-center mt-1">
                        <MapPin className="w-3 h-3 mr-1" />
                        {ride.from} → {ride.to}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg text-gray-900">${ride.amount}</div>
                    <div className="text-xs text-gray-500 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {ride.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending Driver Approvals */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold">Pending Driver Approvals</CardTitle>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingDrivers.map((driver) => (
                <div key={driver.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{driver.name}</h4>
                      <p className="text-sm text-gray-600">{driver.email}</p>
                    </div>
                    {getStatusBadge(driver.status)}
                  </div>
                  <div className="text-sm text-gray-600 mb-3">
                    <p>
                      <strong>Phone:</strong> {driver.phone}
                    </p>
                    <p>
                      <strong>Vehicle:</strong> {driver.vehicle}
                    </p>
                    <p>
                      <strong>Applied:</strong> {driver.appliedDate}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 flex-1">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50 flex-1 bg-transparent"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                    <Button size="sm" variant="outline">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button className="h-20 flex-col space-y-2 bg-blue-600 hover:bg-blue-700">
              <Users className="w-6 h-6" />
              <span>Manage Drivers</span>
            </Button>
            <Button className="h-20 flex-col space-y-2 bg-green-600 hover:bg-green-700">
              <Car className="w-6 h-6" />
              <span>View Live Rides</span>
            </Button>
            <Button className="h-20 flex-col space-y-2 bg-purple-600 hover:bg-purple-700">
              <TrendingUp className="w-6 h-6" />
              <span>Analytics</span>
            </Button>
            <Button className="h-20 flex-col space-y-2 bg-orange-600 hover:bg-orange-700">
              <AlertTriangle className="w-6 h-6" />
              <span>Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
