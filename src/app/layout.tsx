import type { Metadata } from "next";
import { Space_Grotesk, Lexend, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DialogProvider } from "@/providers/DialogProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";

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
  themeColor:   "#000000",
  width:        "device-width",
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
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${lexend.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[var(--bg-0)] text-[var(--text-hi)] font-sans selection:bg-[var(--accent)] selection:text-[var(--accent-on)]">
        <ThemeProvider>
          <DialogProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </DialogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
