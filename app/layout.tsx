import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Backdrop } from "@/components/ui";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CoupleGames · ¿Quién soy?",
  description:
    "Juego cooperativo de adivinar personajes para parejas y grupos pequeños. Personajes reales traídos en vivo desde APIs públicas gratuitas.",
};

export const viewport: Viewport = {
  themeColor: "#0a0618",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Backdrop />
        {children}
      </body>
    </html>
  );
}
