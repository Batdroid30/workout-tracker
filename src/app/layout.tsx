import type { Metadata } from "next";
import { Space_Grotesk, Lexend, Geist_Mono } from "next/font/google";
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
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Lifts",
  description: "A quieter strength for the long game.",
  manifest: "/manifest.json",
  icons: {
    icon:     [{ url: "/icons/favicon-32.png",     sizes: "32x32",   type: "image/png" }],
    apple:    [{ url: "/icons/apple-icon-180.png", sizes: "180x180", type: "image/png" }],
    shortcut: [{ url: "/icons/favicon-32.png" }],
  },
  appleWebApp: {
    capable:        true,
    statusBarStyle: "black-translucent",
    title:          "Lifts",
    startupImage:   "/icons/icon-512.png",
  },
  openGraph: {
    title:       "Lifts — Workout Tracker",
    description: "A quieter strength for the long game.",
    images:      [{ url: "/icons/icon-512.png" }],
  },
};

export const viewport = {
  themeColor: "#0b0804",
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
      data-theme="warm"
      className={`${spaceGrotesk.variable} ${lexend.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[var(--bg-0)] text-[var(--text-hi)] font-sans selection:bg-[var(--accent)] selection:text-[var(--accent-on)]">
        {/* Aurora — wallpaper, never signal */}
        <div className="aurora-page" aria-hidden>
          <div className="aurora-orb a" />
          <div className="aurora-orb b" />
          <div className="aurora-orb c" />
          <div className="aurora-grain" />
        </div>

        {/*
          Page gradient — scrolls with content so every glass card on the page
          sees warm amber behind it, not just the ones at the very top of the viewport.
          Fades: amber-tinted dark at top → transparent at ~480px → pure bg-0 below.
        */}
        <div
          className="relative z-[1] flex-1 flex flex-col min-h-full"
          style={{
            background: 'linear-gradient(180deg, rgba(200,100,28,0.13) 0%, rgba(200,100,28,0.04) 280px, transparent 480px)',
          }}
        >
          <DialogProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </DialogProvider>
        </div>
      </body>
    </html>
  );
}
