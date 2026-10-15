import type { Metadata } from "next";
import { Fraunces, Geist } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: "Brief — daily job watch",
  description:
    "Tell Brief the roles you want. It checks public job boards every day and notifies you when a new posting fits.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
