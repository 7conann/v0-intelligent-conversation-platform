import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ToastProvider } from "@/components/ui/toast"
import { Suspense } from "react"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Intelligent Conversation Platform",
  description: "AI-powered workspace for intelligent conversations",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/iredondo.png",
        type: "image/jpeg",
        sizes: "any",
      },
    ],
    shortcut: ["/iredondo.png"],
    apple: ["/iredondo.png"],
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${geistSans.variable} ${geistMono.variable}`}>
        <Suspense fallback={null}>
          <ToastProvider>{children}</ToastProvider>
        </Suspense>

        {/* camada global para tooltips (fora de qualquer stacking context) */}
        <div id="tooltip-root"></div>

        <Analytics />
      </body>
    </html>
  )
}
