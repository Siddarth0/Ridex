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
  Car,
  Search,
  Filter,
  Clock,
  Eye,
  MoreHorizontal,
  Navigation,
  Phone,
  Star,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react"

export default function RidesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedRide, setSelectedRide] = useState<any>(null)

  const rides = [
    {
      id: "R001",
      driver: {
        name: "John Smith",
        id: "D001",
        phone: "+1 555-0123",
        rating: 4.9,
        vehicle: "2020 Toyota Camry",
        plate: "ABC-123",
      },
      rider: {
        name: "Sarah Johnson",
        id: "U001",
        phone: "+1 555-0456",
        rating: 4.8,
      },
      pickup: {
        address: "123 Main St, Downtown",
        coordinates: { lat: 40.7128, lng: -74.006 },
        time: "2024-01-20 14:30:00",
      },
      destination: {
        address: "456 Airport Rd, Terminal 1",
        coordinates: { lat: 40.6892, lng: -74.1745 },
        time: "2024-01-20 15:15:00",
      },
      status: "completed",
      fare: {
        base: 8.5,
        distance: 15.25,
        time: 4.75,
        surge: 0,
        total: 28.5,
        commission: 4.28,
        driverEarnings: 24.22,
      },
      distance: 12.5,
      duration: 45,
      requestTime: "2024-01-20 14:25:00",
      startTime: "2024-01-20 14:32:00",
      endTime: "2024-01-20 15:17:00",
      paymentMethod: "Credit Card",
      riderRating: 5,
      driverRating: 5,
      issues: [],
    },
    {
      id: "R002",
      driver: {
        name: "Mike Chen",
        id: "D002",
        phone: "+1 555-0124",
        rating: 4.7,
        vehicle: "2019 Honda Accord",
        plate: "XYZ-789",
      },
      rider: {
        name: "Emily Davis",
        id: "U002",
        phone: "+1 555-0457",
        rating: 4.6,
      },
      pickup: {
        address: "789 Oak Ave, Uptown",
        coordinates: { lat: 40.7589, lng: -73.9851 },
        time: "2024-01-20 16:45:00",
      },
      destination: {
        address: "321 Pine St, Midtown",
        coordinates: { lat: 40.7505, lng: -73.9934 },
        time: null,
      },
      status: "in_progress",
      fare: {
        base: 5.0,
        distance: 8.5,
        time: 2.25,
        surge: 1.5,
        total: 15.75,
        commission: 2.36,
        driverEarnings: 13.39,
      },
      distance: 8.2,
      duration: 25,
      requestTime: "2024-01-20 16:40:00",
      startTime: "2024-01-20 16:47:00",
      endTime: null,
      paymentMethod: "Digital Wallet",
      riderRating: null,
      driverRating: null,
      issues: [],
    },
    {
      id: "R003",
      driver: {
        name: "David Wilson",
        id: "D003",
        phone: "+1 555-0125",
        rating: 4.8,
        vehicle: "2020 Hyundai Elantra",
        plate: "DEF-456",
      },
      rider: {
        name: "Alex Brown",
        id: "U003",
        phone: "+1 555-0458",
        rating: 4.3,
      },
      pickup: {
        address: "555 Hotel Blvd, Business District",
        coordinates: { lat: 40.7614, lng: -73.9776 },
        time: "2024-01-20 13:20:00",
      },
      destination: {
        address: "888 Conference Center Dr",
        coordinates: { lat: 40.7505, lng: -73.9934 },
        time: "2024-01-20 13:35:00",
      },
      status: "cancelled",
      fare: {
        base: 4.0,
        distance: 0,
        time: 0,
        surge: 0,
        total: 0,
        commission: 0,
        driverEarnings: 0,
      },
      distance: 0,
      duration: 0,
      requestTime: "2024-01-20 13:15:00",
      startTime: null,
      endTime: null,
      paymentMethod: "Credit Card",
      riderRating: null,
      driverRating: null,
      issues: ["Rider cancelled", "Driver was 2 minutes away"],
    },
    {
      id: "R004",
      driver: {
        name: "Lisa Garcia",
        id: "D004",
        phone: "+1 555-0126",
        rating: 4.9,
        vehicle: "2021 Nissan Altima",
        plate: "GHI-789",
      },
      rider: {
        name: "Tom Wilson",
        id: "U004",
        phone: "+1 555-0459",
        rating: 4.7,
      },
      pickup: {
        address: "222 Restaurant Row, Food District",
        coordinates: { lat: 40.7282, lng: -74.0776 },
        time: "2024-01-20 19:30:00",
      },
      destination: {
        address: "777 Residential Ave, Suburbs",
        coordinates: { lat: 40.6782, lng: -73.9442 },
        time: "2024-01-20 20:05:00",
      },
      status: "completed",
      fare: {
        base: 6.0,
        distance: 10.25,
        time: 2.0,
        surge: 0,
        total: 18.25,
        commission: 2.74,
        driverEarnings: 15.51,
      },
      distance: 9.8,
      duration: 35,
      requestTime: "2024-01-20 19:25:00",
      startTime: "2024-01-20 19:32:00",
      endTime: "2024-01-20 20:07:00",
      paymentMethod: "Cash",
      riderRating: 4,
      driverRating: 5,
      issues: [],
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
      case "requested":
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Requested</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const filteredRides = rides.filter((ride) => {
    const matchesSearch =
      ride.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ride.driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ride.rider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ride.pickup.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ride.destination.address.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || ride.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ride Management</h1>
          <p className="text-gray-600 mt-1">Monitor and manage all rides in real-time</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Navigation className="w-4 h-4 mr-2" />
            Live Map
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Rides</p>
                <p className="text-2xl font-bold text-gray-900">{rides.length}</p>
              </div>
              <Car className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {rides.filter((r) => r.status === "completed").length}
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
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">
                  {rides.filter((r) => r.status === "in_progress").length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cancelled</p>
                <p className="text-2xl font-bold text-red-600">
                  {rides.filter((r) => r.status === "cancelled").length}
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
                  placeholder="Search rides by ID, driver, rider, or location..."
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
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="requested">Requested</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rides Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Rides ({filteredRides.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredRides.map((ride) => (
              <div key={ride.id} className="p-6 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center">
                      <Car className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">Ride #{ride.id}</h3>
                      <p className="text-gray-600">{new Date(ride.requestTime).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(ride.status)}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setSelectedRide(ride)}>
                          <Eye className="w-4 h-4 mr-1" />
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Ride Details - #{selectedRide?.id}</DialogTitle>
                          <DialogDescription>Complete information about this ride</DialogDescription>
                        </DialogHeader>
                        {selectedRide && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Driver Information */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg">Driver Information</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div>
                                  <p className="font-semibold">{selectedRide.driver.name}</p>
                                  <p className="text-sm text-gray-600">ID: {selectedRide.driver.id}</p>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <Phone className="w-4 h-4 text-gray-500" />
                                  <span>{selectedRide.driver.phone}</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <Star className="w-4 h-4 text-yellow-500" />
                                  <span>{selectedRide.driver.rating}/5.0</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <Car className="w-4 h-4 text-gray-500" />
                                  <span>
                                    {selectedRide.driver.vehicle} ({selectedRide.driver.plate})
                                  </span>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Rider Information */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg">Rider Information</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div>
                                  <p className="font-semibold">{selectedRide.rider.name}</p>
                                  <p className="text-sm text-gray-600">ID: {selectedRide.rider.id}</p>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <Phone className="w-4 h-4 text-gray-500" />
                                  <span>{selectedRide.rider.phone}</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <Star className="w-4 h-4 text-yellow-500" />
                                  <span>{selectedRide.rider.rating}/5.0</span>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Trip Details */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg">Trip Details</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div>
                                  <p className="text-sm text-gray-600">Pickup</p>
                                  <p className="font-medium">{selectedRide.pickup.address}</p>
                                  <p className="text-xs text-gray-500">
                                    {selectedRide.pickup.time && new Date(selectedRide.pickup.time).toLocaleString()}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">Destination</p>
                                  <p className="font-medium">{selectedRide.destination.address}</p>
                                  <p className="text-xs text-gray-500">
                                    {selectedRide.destination.time &&
                                      new Date(selectedRide.destination.time).toLocaleString()}
                                  </p>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Distance</span>
                                  <span className="font-medium">{selectedRide.distance} miles</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Duration</span>
                                  <span className="font-medium">{selectedRide.duration} min</span>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Fare Breakdown */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg">Fare Breakdown</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span>Base Fare</span>
                                  <span>${selectedRide.fare.base}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Distance</span>
                                  <span>${selectedRide.fare.distance}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Time</span>
                                  <span>${selectedRide.fare.time}</span>
                                </div>
                                {selectedRide.fare.surge > 0 && (
                                  <div className="flex items-center justify-between">
                                    <span>Surge ({selectedRide.fare.surge}x)</span>
                                    <span className="text-orange-600">
                                      +${(selectedRide.fare.total * (selectedRide.fare.surge - 1)).toFixed(2)}
                                    </span>
                                  </div>
                                )}
                                <div className="border-t pt-2">
                                  <div className="flex items-center justify-between font-semibold">
                                    <span>Total</span>
                                    <span>${selectedRide.fare.total}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-sm text-gray-600">
                                    <span>Commission (15%)</span>
                                    <span>-${selectedRide.fare.commission}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-sm font-medium text-green-600">
                                    <span>Driver Earnings</span>
                                    <span>${selectedRide.fare.driverEarnings}</span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Ratings */}
                            {(selectedRide.riderRating || selectedRide.driverRating) && (
                              <Card className="md:col-span-2">
                                <CardHeader>
                                  <CardTitle className="text-lg">Ratings</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="grid grid-cols-2 gap-4">
                                    {selectedRide.riderRating && (
                                      <div>
                                        <p className="text-sm text-gray-600">Rider rated driver</p>
                                        <div className="flex items-center space-x-1">
                                          {[...Array(5)].map((_, i) => (
                                            <Star
                                              key={i}
                                              className={`w-4 h-4 ${
                                                i < selectedRide.riderRating
                                                  ? "text-yellow-500 fill-current"
                                                  : "text-gray-300"
                                              }`}
                                            />
                                          ))}
                                          <span className="ml-2 font-medium">{selectedRide.riderRating}/5</span>
                                        </div>
                                      </div>
                                    )}
                                    {selectedRide.driverRating && (
                                      <div>
                                        <p className="text-sm text-gray-600">Driver rated rider</p>
                                        <div className="flex items-center space-x-1">
                                          {[...Array(5)].map((_, i) => (
                                            <Star
                                              key={i}
                                              className={`w-4 h-4 ${
                                                i < selectedRide.driverRating
                                                  ? "text-yellow-500 fill-current"
                                                  : "text-gray-300"
                                              }`}
                                            />
                                          ))}
                                          <span className="ml-2 font-medium">{selectedRide.driverRating}/5</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            )}

                            {/* Issues */}
                            {selectedRide.issues.length > 0 && (
                              <Card className="md:col-span-2">
                                <CardHeader>
                                  <CardTitle className="text-lg flex items-center">
                                    <AlertTriangle className="w-5 h-5 text-orange-500 mr-2" />
                                    Issues Reported
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <ul className="space-y-2">
                                    {selectedRide.issues.map((issue, index) => (
                                      <li key={index} className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                        <span>{issue}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </CardContent>
                              </Card>
                            )}
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                    <Button variant="outline" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Driver & Rider</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Driver:</span>
                        <span className="font-medium">{ride.driver.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Rider:</span>
                        <span className="font-medium">{ride.rider.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Vehicle:</span>
                        <span className="font-medium">{ride.driver.vehicle}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Trip Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Distance:</span>
                        <span className="font-medium">{ride.distance} miles</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Duration:</span>
                        <span className="font-medium">{ride.duration} min</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Fare:</span>
                        <span className="font-medium text-green-600">${ride.fare.total}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full mt-1"></div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Pickup</p>
                      <p className="text-sm text-gray-600">{ride.pickup.address}</p>
                      <p className="text-xs text-gray-500">
                        {ride.pickup.time && new Date(ride.pickup.time).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full mt-1"></div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Destination</p>
                      <p className="text-sm text-gray-600">{ride.destination.address}</p>
                      <p className="text-xs text-gray-500">
                        {ride.destination.time ? new Date(ride.destination.time).toLocaleString() : "Not reached"}
                      </p>
                    </div>
                  </div>
                </div>

                {ride.issues.length > 0 && (
                  <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      <span className="font-medium text-orange-800">Issues Reported</span>
                    </div>
                    <ul className="text-sm text-orange-700 space-y-1">
                      {ride.issues.map((issue, index) => (
                        <li key={index}>• {issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    <span>Payment: {ride.paymentMethod}</span>
                    {ride.riderRating && ride.driverRating && (
                      <>
                        <span className="mx-2">•</span>
                        <span>
                          Ratings: {ride.riderRating}★ / {ride.driverRating}★
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    {ride.status === "in_progress" && (
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        <Navigation className="w-4 h-4 mr-1" />
                        Track Live
                      </Button>
                    )}
                    {ride.issues.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-orange-600 border-orange-200 hover:bg-orange-50 bg-transparent"
                      >
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        Review Issues
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
