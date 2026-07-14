import type React from "react"
import { Bricolage_Grotesque, Hanken_Grotesk, Space_Mono, Mukta } from "next/font/google"
import "./globals.css"
import { Toaster } from "sonner"

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display-face",
  weight: ["600", "700", "800"],
})
const sans = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans-face",
})
const mono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-mono-face",
  weight: ["400", "700"],
})
const devanagari = Mukta({
  subsets: ["devanagari", "latin"],
  variable: "--font-deva-face",
  weight: ["400", "600", "700"],
})

export const metadata = {
  title: "RideX — Kathmandu's ride, on your terms",
  description:
    "Book a bike or car across the Kathmandu valley. Cash-first, landmark-friendly, verified drivers. Built for Nepal.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        className={`${display.variable} ${sans.variable} ${mono.variable} ${devanagari.variable} font-sans antialiased`}
      >
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
