import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nirmaan Watch | Code Crew",
  description: "MPLADS project monitoring, fund transparency and explainable anomaly review. SIH26102 by Code Crew.",
  metadataBase: new URL("https://nirmaan-watch-code-crew.dm7903337.chatgpt.site"),
  openGraph: {
    title: "Nirmaan Watch | Code Crew",
    description: "Explore 60,359 supplied MPLADS works, recorded allocations, MPs and approval statuses across India.",
    images: [{ url: "/og.png", width: 1732, height: 908, alt: "Nirmaan Watch - MPLADS development monitor" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nirmaan Watch | Code Crew",
    description: "Explore the complete supplied MPLADS dataset.",
    images: ["/og.png"],
  },
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
