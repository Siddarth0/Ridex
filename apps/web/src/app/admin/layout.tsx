"use client"
import { useState, Suspense } from "react"
import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Wordmark } from "@/components/brand/wordmark"
import {
  LayoutDashboard,
  Users,
  Car,
  MapPin,
  BarChart3,
  Settings,
  Menu,
  X,
  Shield,
} from "lucide-react"

interface AdminLayoutProps {
  children: React.ReactNode
}

const NAV = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Live Map", href: "/admin/locations", icon: MapPin },
  { name: "Drivers", href: "/admin/drivers", icon: Users },
  { name: "Rides", href: "/admin/rides", icon: Car },
  { name: "Pricing", href: "/admin/pricing", icon: Settings },
  { name: "Audit Log", href: "/admin/audit", icon: Shield },
  { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
]

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  const navLinks = (onClick?: () => void) => (
    <nav className="flex-1 space-y-1 px-3 py-6">
      {NAV.map((item) => {
        const active = pathname === item.href
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onClick}
            className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-crimson text-white"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            <item.icon className="h-5 w-5" />
            {item.name}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
      <div className="min-h-screen bg-paper">
        {/* Mobile sidebar */}
        <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? "block" : "hidden"}`}>
          <div className="fixed inset-0 bg-midnight/70" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-midnight">
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
              <Wordmark tone="light" href="/admin" />
              <button onClick={() => setSidebarOpen(false)} className="text-white/60 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>
            {navLinks(() => setSidebarOpen(false))}
          </div>
        </div>

        {/* Desktop sidebar */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
          <div className="flex grow flex-col bg-midnight">
            <div className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
              <Wordmark tone="light" href="/admin" />
              <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-marigold">
                Ops
              </span>
            </div>
            {navLinks()}
            <div className="border-t border-white/10 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                  <Shield className="h-4 w-4 text-marigold" />
                </span>
                <div className="text-xs">
                  <div className="font-medium text-white">Admin console</div>
                  <div className="font-deva text-white/50">काठमाडौँ</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="lg:pl-64">
          <div className="sticky top-0 z-40 border-b border-border bg-paper/85 backdrop-blur lg:hidden">
            <div className="flex h-16 items-center justify-between px-4">
              <button onClick={() => setSidebarOpen(true)} className="p-2 text-ink">
                <Menu className="h-6 w-6" />
              </button>
              <Wordmark tone="dark" href="/admin" />
              <span className="w-6" />
            </div>
          </div>
          <main>{children}</main>
        </div>
      </div>
    </Suspense>
  )
}
