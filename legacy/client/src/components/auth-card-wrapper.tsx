import type React from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface AuthCardWrapperProps {
  children: React.ReactNode
  className?: string
  size?: "sm" | "md" | "lg"
  centered?: boolean
}

const AuthCardWrapper = ({ children, className, size = "md", centered = true }: AuthCardWrapperProps) => {
  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
  }

  const containerClasses = centered ? "flex min-h-screen items-center justify-center p-4" : "p-4"

  return (
    <div className={containerClasses}>
      <Card
        className={cn(
          "w-full bg-white/80 backdrop-blur-sm text-gray-900 shadow-xl border border-white/20 transition-all duration-300 hover:shadow-2xl hover:scale-[1.01]",
          sizeClasses[size],
          className,
        )}
      >
        {children}
      </Card>
    </div>
  )
}

export default AuthCardWrapper
