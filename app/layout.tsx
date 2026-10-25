import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pranex | Commerce Operations",
  description: "A secure operational workspace for agri and veterinary commerce.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
