import Link from "next/link"
import Image from "next/image"

/** RideX wordmark: the logo mark in an emerald tile + the display-type name. */
export function Wordmark({
  href = "/",
  tone = "dark",
  className = "",
}: {
  href?: string
  /** "dark" = for light backgrounds (ink text); "light" = for dark backgrounds. */
  tone?: "dark" | "light"
  className?: string
}) {
  const text = tone === "light" ? "text-white" : "text-ink"
  return (
    <Link href={href} className={`group inline-flex items-center gap-2.5 ${className}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-crimson p-1">
        <Image src="/ridexlogo.png" alt="RideX" width={28} height={28} className="object-contain" priority />
      </span>
      <span className={`font-display text-xl font-extrabold tracking-tight ${text}`}>
        Ride<span className="text-crimson">X</span>
      </span>
    </Link>
  )
}
