import type { Metadata } from "next";
import { Space_Grotesk, Lexend } from "next/font/google";
import "./globals.css";
import { DialogProvider } from "@/providers/DialogProvider";
import { ToastProvider } from "@/providers/ToastProvider";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Lifts",
  description: "Track your lifts, PRs, and progress. Engineered for athletes.",
  manifest: "/manifest.json",
  // ── Icons ──────────────────────────────────────────────────────────────────
  // favicon-32 → browser tab
  // apple-icon → iOS "Add to Home Screen" bookmark
  // icon-192   → Android PWA install prompt
  icons: {
    icon:             [{ url: "/icons/favicon-32.png",    sizes: "32x32",   type: "image/png" }],
    apple:            [{ url: "/icons/apple-icon-180.png", sizes: "180x180", type: "image/png" }],
    shortcut:         [{ url: "/icons/favicon-32.png" }],
  },
  // ── iOS PWA behaviour ──────────────────────────────────────────────────────
  appleWebApp: {
    capable:         true,
    statusBarStyle:  "black-translucent",
    title:           "Lifts",
    startupImage:    "/icons/icon-512.png",
  },
  // ── Open Graph (share previews) ───────────────────────────────────────────
  openGraph: {
    title:       "Lifts — Workout Tracker",
    description: "Track your lifts, PRs, and progress.",
    images:      [{ url: "/icons/icon-512.png" }],
  },
};

export const viewport = {
  themeColor: "#070d1f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${lexend.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#070d1f] text-[#dce1fb] font-sans selection:bg-[#CCFF00] selection:text-[#020617]">
        <DialogProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </DialogProvider>
      </body>
    </html>
  );
}
