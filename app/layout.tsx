import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "¿Quién soy? · CoupleGames",
  description:
    "Juego cooperativo de adivinar personajes para parejas y grupos pequeños. Personajes reales traídos en vivo desde APIs públicas gratuitas.",
};

export const viewport: Viewport = {
  themeColor: "#fdf3e3",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // The font variables live on <html> so the Tailwind theme tokens that
    // reference them resolve at :root, where the theme is defined.
    <html lang="es" className={`${fredoka.variable} ${nunito.variable}`}>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
