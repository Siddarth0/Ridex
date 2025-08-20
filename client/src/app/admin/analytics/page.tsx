"use client"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Car,
  DollarSign,
  Clock,
  MapPin,
  Star,
  Download,
} from "lucide-react"

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("7d")

  const metrics = {
    totalRevenue: { value: 125430, change: 12.5, trend: "up" },
    totalRides: { value: 15634, change: 8.3, trend: "up" },
    activeDrivers: { value: 892, change: -2.1, trend: "down" },
    avgRating: { value: 4.8, change: 0.2, trend: "up" },
    avgFare: { value: 18.5, change: 5.2, trend: "up" },
    completionRate: { value: 94.2, change: 1.8, trend: "up" },
  }

  const revenueData = [
    { period: "Mon", revenue: 15420, rides: 234 },
    { period: "Tue", revenue: 18750, rides: 289 },
    { period: "Wed", revenue: 22100, rides: 312 },
    { period: "Thu", revenue: 19800, rides: 276 },
    { period: "Fri", revenue: 25600, rides: 367 },
    { period: "Sat", revenue: 28900, rides: 421 },
    { period: "Sun", revenue: 24300, rides: 356 },
  ]

  const topDrivers = [
    { name: "John Smith", rides: 127, earnings: 2840, rating: 4.9 },
    { name: "Sarah Johnson", rides: 118, earnings: 2650, rating: 4.8 },
    { name: "Mike Chen", rides: 109, earnings: 2420, rating: 4.7 },
    { name: "Emily Davis", rides: 98, earnings: 2180, rating: 4.9 },
    { name: "David Wilson", rides: 87, earnings: 1950, rating: 4.8 },
  ]

  const popularRoutes = [
    { from: "Downtown", to: "Airport", rides: 234, avgFare: 28.5 },
    { from: "University", to: "Mall", rides: 189, avgFare: 15.75 },
    { from: "Hotel District", to: "Convention Center", rides: 156, avgFare: 22.0 },
    { from: "Residential Area", to: "Business District", rides: 143, avgFare: 19.25 },
    { from: "Train Station", to: "City Center", rides: 128, avgFare: 16.8 },
  ]

  const hourlyData = [
    { hour: "00", rides: 12, drivers: 45 },
    { hour: "01", rides: 8, drivers: 38 },
    { hour: "02", rides: 5, drivers: 32 },
    { hour: "03", rides: 4, drivers: 28 },
    { hour: "04", rides: 6, drivers: 35 },
    { hour: "05", rides: 15, drivers: 52 },
    { hour: "06", rides: 28, drivers: 78 },
    { hour: "07", rides: 45, drivers: 125 },
    { hour: "08", rides: 67, drivers: 156 },
    { hour: "09", rides: 52, drivers: 134 },
    { hour: "10", rides: 38, drivers: 98 },
    { hour: "11", rides: 42, drivers: 112 },
    { hour: "12", rides: 58, drivers: 145 },
    { hour: "13", rides: 48, drivers: 128 },
    { hour: "14", rides: 35, drivers: 95 },
    { hour: "15", rides: 41, drivers: 108 },
    { hour: "16", rides: 55, drivers: 142 },
    { hour: "17", rides: 72, drivers: 168 },
    { hour: "18", rides: 68, drivers: 159 },
    { hour: "19", rides: 54, drivers: 138 },
    { hour: "20", rides: 43, drivers: 115 },
    { hour: "21", rides: 35, drivers: 92 },
    { hour: "22", rides: 28, drivers: 75 },
    { hour: "23", rides: 18, drivers: 58 },
  ]

  const getTrendIcon = (trend: string) => {
    return trend === "up" ? (
      <TrendingUp className="w-4 h-4 text-green-600" />
    ) : (
      <TrendingDown className="w-4 h-4 text-red-600" />
    )
  }

  const getTrendColor = (trend: string) => {
    return trend === "up" ? "text-green-600" : "text-red-600"
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Comprehensive insights and performance metrics</p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div className={`flex items-center space-x-1 ${getTrendColor(metrics.totalRevenue.trend)}`}>
                {getTrendIcon(metrics.totalRevenue.trend)}
                <span className="text-sm font-medium">{metrics.totalRevenue.change}%</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900">${metrics.totalRevenue.value.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Car className="w-6 h-6 text-blue-600" />
              </div>
              <div className={`flex items-center space-x-1 ${getTrendColor(metrics.totalRides.trend)}`}>
                {getTrendIcon(metrics.totalRides.trend)}
                <span className="text-sm font-medium">{metrics.totalRides.change}%</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Rides</p>
              <p className="text-3xl font-bold text-gray-900">{metrics.totalRides.value.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div className={`flex items-center space-x-1 ${getTrendColor(metrics.activeDrivers.trend)}`}>
                {getTrendIcon(metrics.activeDrivers.trend)}
                <span className="text-sm font-medium">{Math.abs(metrics.activeDrivers.change)}%</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Active Drivers</p>
              <p className="text-3xl font-bold text-gray-900">{metrics.activeDrivers.value}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-yellow-600" />
              </div>
              <div className={`flex items-center space-x-1 ${getTrendColor(metrics.avgRating.trend)}`}>
                {getTrendIcon(metrics.avgRating.trend)}
                <span className="text-sm font-medium">{metrics.avgRating.change}</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Average Rating</p>
              <p className="text-3xl font-bold text-gray-900">{metrics.avgRating.value}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <div className={`flex items-center space-x-1 ${getTrendColor(metrics.avgFare.trend)}`}>
                {getTrendIcon(metrics.avgFare.trend)}
                <span className="text-sm font-medium">{metrics.avgFare.change}%</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Average Fare</p>
              <p className="text-3xl font-bold text-gray-900">${metrics.avgFare.value}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-teal-600" />
              </div>
              <div className={`flex items-center space-x-1 ${getTrendColor(metrics.completionRate.trend)}`}>
                {getTrendIcon(metrics.completionRate.trend)}
                <span className="text-sm font-medium">{metrics.completionRate.change}%</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Completion Rate</p>
              <p className="text-3xl font-bold text-gray-900">{metrics.completionRate.value}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Revenue Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {revenueData.map((day, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="w-12 text-sm font-medium text-gray-600">{day.period}</span>
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-emerald-600 h-2 rounded-full"
                          style={{ width: `${(day.revenue / Math.max(...revenueData.map((d) => d.revenue))) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">${day.revenue.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{day.rides} rides</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Drivers */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Top Performing Drivers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topDrivers.map((driver, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{driver.name}</p>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span>{driver.rides} rides</span>
                        <span>•</span>
                        <div className="flex items-center space-x-1">
                          <Star className="w-3 h-3 text-yellow-500 fill-current" />
                          <span>{driver.rating}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">${driver.earnings}</p>
                    <p className="text-xs text-gray-500">this week</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Routes */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Popular Routes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {popularRoutes.map((route, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-medium text-gray-900">{route.from}</span>
                      <span className="text-gray-400">→</span>
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="font-medium text-gray-900">{route.to}</span>
                    </div>
                    <p className="text-sm text-gray-600">{route.rides} rides this week</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">${route.avgFare}</p>
                    <p className="text-xs text-gray-500">avg fare</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Hourly Activity */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Hourly Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {hourlyData.map((hour, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="w-8 text-gray-600">{hour.hour}:00</span>
                  <div className="flex-1 mx-4">
                    <div className="flex space-x-2">
                      <div className="flex-1">
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full"
                            style={{ width: `${(hour.rides / Math.max(...hourlyData.map((h) => h.rides))) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-emerald-600 h-1.5 rounded-full"
                            style={{
                              width: `${(hour.drivers / Math.max(...hourlyData.map((h) => h.drivers))) * 100}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-4 text-xs">
                    <span className="text-blue-600">{hour.rides}R</span>
                    <span className="text-emerald-600">{hour.drivers}D</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center space-x-6 mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                <span className="text-sm text-gray-600">Rides</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-emerald-600 rounded-full"></div>
                <span className="text-sm text-gray-600">Drivers</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
