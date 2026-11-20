import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DialogProvider } from "@/providers/DialogProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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
  // eslint-disable-next-line no-restricted-syntax -- Next metadata needs a literal colour, tokens are CSS-only
  themeColor:   "#0b0d10",
  width:        "device-width",
  initialScale: 1,
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
      className={`${geist.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-bg text-primary font-sans selection:bg-accent selection:text-on-accent">
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
