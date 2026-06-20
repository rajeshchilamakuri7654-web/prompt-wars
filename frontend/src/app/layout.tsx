import type { Metadata, Viewport } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aetheria Carbon | Real-time Footprint Simulator & Visualization",
  description: "Calculate, simulate, and visualize your personal annual CO2 carbon footprint in real-time with our anti-gravity, weightless 3D particle visualizer and habit adjustment simulator.",
  keywords: ["carbon footprint", "sustainability", "climate change", "reduction simulator", "3D particle webgl", "Three.js"],
  authors: [{ name: "Aetheria Sustainability Group" }],
};

export const viewport: Viewport = {
  themeColor: "#05070e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
