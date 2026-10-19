import type { Metadata } from "next";
import "./globals.css";
import "./ui.css";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "PrimeSchool | School Management",
  description: "A focused school management platform for modern schools"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}