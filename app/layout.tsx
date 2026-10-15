import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Millionaire Reader — Newsstand",
  description: "The Millionaire Mind for the Millionaire Reader. Building the millionaire mind.",
  metadataBase: new URL("https://themillionairereader.substack.com"),
  openGraph: {
    title: "The Millionaire Reader — Newsstand",
    description: "A reading room for ideas that compound.",
    type: "website"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
