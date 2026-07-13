import type React from "react"
import { Toaster } from "sonner"

interface AuthLayoutProps {
  children: React.ReactNode
}

const Layout = ({ children }: AuthLayoutProps) => {
  return (
    <>
      {/* Auth pages container */}
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-100 rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-100 rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-50 rounded-full opacity-30 blur-3xl"></div>
        </div>

        {/* Content wrapper */}
        <div className="relative z-10">{children}</div>

        {/* Toast notifications */}
        <Toaster
          position="top-right"
          richColors
          toastOptions={{
            style: {
              background: "white",
              border: "1px solid #e5e7eb",
              color: "#374151",
            },
          }}
        />
      </div>
    </>
  )
}

export default Layout
