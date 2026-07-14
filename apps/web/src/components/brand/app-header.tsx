"use client"
import type { ReactNode } from "react"
import { LogOut } from "lucide-react"
import { Wordmark } from "@/components/brand/wordmark"
import { Button } from "@/components/ui/button"

/** Top bar for signed-in rider/driver surfaces: wordmark, a role chip, sign out. */
export function AppHeader({
  role,
  onSignOut,
  children,
}: {
  role?: string
  onSignOut?: () => void
  children?: ReactNode
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Wordmark tone="dark" />
        <div className="flex items-center gap-3">
          {children}
          {role && (
            <span className="hidden rounded-full bg-midnight px-3 py-1 text-xs font-medium capitalize text-marigold sm:inline">
              {role}
            </span>
          )}
          {onSignOut && (
            <Button variant="outline" size="sm" onClick={onSignOut} className="border-border">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
