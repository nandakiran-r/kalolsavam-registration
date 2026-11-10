import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Manrope } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { COLLEGE_NAME, KALOLSAVAM_YEAR } from "@/lib/constants";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

export const metadata: Metadata = {
  title: `Kalolsavam ${KALOLSAVAM_YEAR} Registration · ${COLLEGE_NAME}`,
  description:
    "Student registration portal for Kalolsavam at St. Joseph's College (Autonomous), Devagiri. Register for individual events and download your signed registration slip.",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#13243a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${manrope.variable} ${bricolage.variable}`}>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
