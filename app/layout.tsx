import type { Metadata } from "next";
import { Inter, Libre_Baskerville } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/lib/i18n/LangProvider";
import { SessionProvider } from "@/components/SessionProvider";
import { SmoothScroll } from "@/lib/animations/SmoothScroll";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const libre = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-libre",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Polaris — Your AI North Star for Academic Strategy",
  description:
    "Polaris is a fully autonomous AI academic strategist. Reverse-engineer a competitive university application profile from school to graduate school.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`starfield antialiased ${inter.variable} ${libre.variable} font-sans`}
      >
        <SessionProvider>
          <SmoothScroll>
            <LangProvider>{children}</LangProvider>
          </SmoothScroll>
        </SessionProvider>
      </body>
    </html>
  );
}
