import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crónicas FCG | Board Sandbox",
  description: "Sandbox de mesa para Crónicas FCG",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
