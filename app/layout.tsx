import type { Metadata } from "next";
import PlausibleProvider from "next-plausible";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

let title = "Sitecoder – AI Code Generator";
let description = "Generate your next app with AI";
let url =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://appdev-28a4-3000.prg1.zerops.app";
let ogimage = `${url}/og-image.png`;
let sitename = "sitecoder";

export const metadata: Metadata = {
  metadataBase: new URL(url),
  title,
  description,
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    images: [ogimage],
    title,
    description,
    url: url,
    siteName: sitename,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    images: [ogimage],
    title,
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="h-full">
        <head>
          <PlausibleProvider domain={url.replace(/^https?:\/\//, "")} />
        </head>
        {children}
      </html>
    </ClerkProvider>
  );
}
