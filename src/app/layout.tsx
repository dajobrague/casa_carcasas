import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "react-hot-toast";
import dynamic from "next/dynamic";

// Cargar el componente del programador dinámicamente (solo en el cliente)
const SchedulerInit = dynamic(() => import("@/components/SchedulerInit"), {
  ssr: false,
});

export const metadata: Metadata = {
  title: "Casa Carcasas",
  description: "La Casa de las Carcasas - Planning App",
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="h-full bg-gray-50">
        <AuthProvider>
          <Toaster position="top-center" />
          <main className="min-h-screen">
            {children}
          </main>
          <SchedulerInit />
        </AuthProvider>
      </body>
    </html>
  );
} 