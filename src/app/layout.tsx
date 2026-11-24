import "./globals.css";
import type { Metadata, Viewport } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";
import ServiceWorker from "@/components/ServiceWorker";

export const metadata: Metadata = {
  title: "Mediconnect",
  description: "Smart Medical Appointment Platform",
  applicationName: "MediConnect",
  appleWebApp: { capable: true, title: "MediConnect", statusBarStyle: "default" },
  icons: { apple: "/pwa-icon/180" },
};

export const viewport: Viewport = {
  themeColor: "#0891b2",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <ServiceWorker />
        <Navbar />
        <SmoothScroll>
          <main className="min-h-screen">{children}</main>
        </SmoothScroll>
        <Footer />
      </body>
    </html>
  );
}
