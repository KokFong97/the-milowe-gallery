import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Milowe Gallery — Our Wedding Through Your Eyes",
  description:
    "A shared wedding photo gallery built from the moments our guests notice.",
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
