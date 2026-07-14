"use client"
import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Script from "next/script"
import api from "@/lib/api"
import { toast } from "sonner"

// Extend Window interface for Google Maps
declare global {
  interface Window {
    google: any
    initMap: () => void
  }
}
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  MapPin, 
  Navigation, 
  Clock, 
  Car, 
  User, 
  Star,
  ChevronRight,
  Search,
  Heart,
  Home,
  Briefcase
} from "lucide-react"

export default function DashboardPage() {
  const router = useRouter()
  const mapRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [map, setMap] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [pickupLocation, setPickupLocation] = useState("")
  const [destination, setDestination] = useState("")

  // Initialize Google Map
  const initMap = () => {
    if (!mapRef.current || !window.google) return

    const mapOptions: any = {
      center: { lat: 40.7831, lng: -73.9712 }, // Default to NYC
      zoom: 13,
      disableDefaultUI: true,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }]
        }
      ]
    }

    const googleMap = new window.google.maps.Map(mapRef.current, mapOptions)
    setMap(googleMap)

    // Add some sample driver markers
    const driverLocations = [
      { lat: 40.7831, lng: -73.9712 },
      { lat: 40.7851, lng: -73.9732 },
      { lat: 40.7811, lng: -73.9692 }
    ]

    driverLocations.forEach((location, index) => {
      new window.google.maps.Marker({
        position: location,
        map: googleMap,
        title: `Driver ${index + 1}`,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="8" fill="#059669" stroke="white" stroke-width="2"/>
              <path d="M8 12L16 12M12 8L12 16" stroke="white" stroke-width="2"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(24, 24)
        }
      })
    })
  }

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true)
        const response = await api.get("/users/profile")
        setProfile(response.data?.data || response.data)
      } catch (err: any) {
        if (err?.response?.status === 401) {
          toast.error("Session expired. Please sign in again.")
          router.push("/login")
        } else {
          toast.error("Failed to load profile")
        }
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [router])

  // Initialize map when Google Maps API is loaded
  useEffect(() => {
    if (mapLoaded) {
      initMap()
    }
  }, [mapLoaded])

  // Make initMap available globally for the script callback
  useEffect(() => {
    window.initMap = initMap
    return () => {
      if (window.initMap) {
        window.initMap = undefined as any
      }
    }
  }, [])

  const firstName = profile?.firstName || "User"

  const savedPlaces = [
    { icon: Home, label: "Home", address: "123 Main Street, Downtown" },
    { icon: Briefcase, label: "Work", address: "456 Business Ave, Financial District" },
    { icon: Heart, label: "Favorite", address: "789 Park Plaza, Central Park" },
  ]

  const rideTypes = [
    { id: "ridex", name: "RideX", time: "3 min", price: "$8-12", icon: "🚗" },
    { id: "comfort", name: "Comfort", time: "5 min", price: "$12-18", icon: "🚙" },
    { id: "xl", name: "RideX XL", time: "4 min", price: "$15-22", icon: "🚐" },
    { id: "premium", name: "Premium", time: "6 min", price: "$25-35", icon: "🚗" },
  ]

  const handleBookRide = () => {
    if (!pickupLocation || !destination) {
      toast.error("Please enter both pickup and destination locations")
      return
    }
    router.push(`/book-ride?pickup=${encodeURIComponent(pickupLocation)}&destination=${encodeURIComponent(destination)}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  return (
    <>
      {/* Google Maps Script */}
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&callback=initMap`}
        onLoad={() => setMapLoaded(true)}
        onError={() => {
          console.error("Failed to load Google Maps")
          toast.error("Failed to load map")
        }}
      />
      
      <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar */}
      <div className="w-96 bg-white shadow-lg overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Good morning, {firstName}</h1>
              <div className="flex items-center space-x-1">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="text-sm text-gray-600">4.9</span>
              </div>
            </div>
          </div>
        </div>

        {/* Location Inputs */}
        <div className="p-6 space-y-4">
          <div className="space-y-3">
            {/* Pickup Location */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-emerald-600 rounded-full"></div>
              <Input
                placeholder="Pickup location"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                className="pl-10 h-12 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>

            {/* Connecting Line */}
            <div className="flex justify-center">
              <div className="w-px h-6 bg-gray-300"></div>
            </div>

            {/* Destination */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-gray-400 rounded-sm"></div>
              <Input
                placeholder="Where to?"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="pl-10 h-12 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Add Stop Button */}
          <Button variant="ghost" className="w-full justify-start text-emerald-600 hover:bg-emerald-50">
            <Search className="w-4 h-4 mr-2" />
            Add a stop
          </Button>
        </div>

        {/* Saved Places */}
        <div className="px-6 pb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Saved places</h3>
          <div className="space-y-2">
            {savedPlaces.map((place) => (
              <button
                key={place.label}
                onClick={() => setDestination(place.address)}
                className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <place.icon className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-gray-900">{place.label}</div>
                  <div className="text-xs text-gray-500 truncate">{place.address}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            ))}
          </div>
        </div>

        {/* Ride Options */}
        {(pickupLocation && destination) && (
          <div className="px-6 pb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Choose a ride</h3>
            <div className="space-y-2">
              {rideTypes.map((ride) => (
                <Card key={ride.id} className="cursor-pointer hover:bg-gray-50 transition-colors border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{ride.icon}</div>
                        <div>
                          <div className="font-medium text-gray-900">{ride.name}</div>
                          <div className="text-sm text-gray-500">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {ride.time} away
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">{ride.price}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Book Ride Button */}
            <Button 
              onClick={handleBookRide}
              className="w-full mt-4 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg"
            >
              <Car className="w-4 h-4 mr-2" />
              Confirm RideX
            </Button>
          </div>
        )}
      </div>

      {/* Right Side - Map Area */}
      <div className="flex-1 relative">
        {/* Map Container */}
        <div className="absolute inset-0 bg-gray-100">
          {/* Google Maps Container */}
          <div ref={mapRef} className="w-full h-full" />
          
          {/* Loading overlay */}
          {!mapLoaded && (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">Loading map...</h3>
                <p className="text-sm text-gray-500">Connecting to Google Maps</p>
              </div>
            </div>
          )}
        </div>

        {/* Floating Action Buttons */}
        <div className="absolute top-6 right-6 space-y-3">
          <Button size="sm" variant="outline" className="bg-white shadow-lg">
            <Navigation className="w-4 h-4" />
          </Button>
        </div>

        {/* Current Location Button */}
        <div className="absolute bottom-24 right-6">
          <Button 
            size="sm" 
            className="bg-white hover:bg-gray-50 text-gray-700 shadow-lg border border-gray-200"
            onClick={() => setPickupLocation("Current location")}
          >
            <Navigation className="w-4 h-4 mr-2" />
            Current location
          </Button>
        </div>
      </div>
    </div>
    </>
  )
}