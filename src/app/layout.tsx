import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NextTopLoader from "nextjs-toploader";
import { useLanguage, useLocale } from "./dictionaries";
import { RootContext } from "@/contexts/RootContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const dict = await useLanguage();
  const locale = await useLocale();

  return (
    <html lang={locale}>
      <NextTopLoader
        // color={"#B14C59"}
        showSpinner={false}
        zIndex={1600}
        speed={700}
      />
      <body className={inter.className}>
        <RootContext dict={dict} locale={locale}>
          {children}
        </RootContext>
      </body>
    </html>
  );
}
