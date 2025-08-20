import type React from "react"
import Image from "next/image"
import Link from "next/link"
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import AuthCardWrapper from "./auth-card-wrapper"

interface SimpleAuthPageProps {
  children: React.ReactNode
  title: string
  description?: string
  showLogo?: boolean
  size?: "sm" | "md" | "lg"
}

const SimpleAuthPage = ({ children, title, description, showLogo = true, size = "md" }: SimpleAuthPageProps) => {
  return (
    <AuthCardWrapper size={size}>
      <CardHeader className="text-center space-y-4">
        {showLogo && (
          <div className="flex flex-col items-center space-y-4">
            <Link href="/" className="inline-flex items-center space-x-3">
              <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center p-1">
                <Image
                  src="/ridexlogo.png"
                  alt="RideX Logo"
                  width={40}
                  height={40}
                  className="object-contain"
                  priority
                />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">RideX</h1>
            </Link>
            <p className="text-sm text-gray-600">Your journey starts here</p>
          </div>
        )}

        <div className="space-y-2">
          <CardTitle className="text-2xl font-bold text-gray-900">{title}</CardTitle>
          {description && <CardDescription className="text-gray-600">{description}</CardDescription>}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">{children}</CardContent>
    </AuthCardWrapper>
  )
}

export default SimpleAuthPage
