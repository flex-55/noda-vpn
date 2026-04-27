import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { ReactQueryProvider } from "@/providers/react-query-provider";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "Noda VPN Checkout",
  description: "Secure SaaS checkout for Noda VPN subscriptions.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${spaceGrotesk.variable} min-h-screen font-sans`}>
        <ReactQueryProvider>{children}</ReactQueryProvider>
      </body>
    </html>
  );
}