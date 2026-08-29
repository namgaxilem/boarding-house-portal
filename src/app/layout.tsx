import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";

import { NavProgress } from "@/components/common/nav-progress";
import { ServiceWorkerRegistration } from "@/components/common/service-worker";
import { ThemeProvider } from "@/components/common/theme";
import { houseConfig } from "@/config/site";

import "./globals.css";

// Be Vietnam Pro carries the full set of Vietnamese diacritics, which Geist
// renders inconsistently for stacked marks (ế, ộ, ữ).
const sans = Be_Vietnam_Pro({
  variable: "--font-geist-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: houseConfig.name,
    template: `%s · ${houseConfig.name}`,
  },
  description: houseConfig.description,
  robots: { index: false, follow: false },

  applicationName: houseConfig.shortName,

  // iOS bỏ qua gần hết web app manifest. Bộ thẻ `apple-mobile-web-app-*` này mới
  // là thứ quyết định app trông thế nào sau khi "Thêm vào MH chính":
  //   capable         — mở toàn màn hình, không có thanh địa chỉ Safari.
  //   title           — tên dưới icon (manifest.short_name không có tác dụng ở iOS).
  //   statusBarStyle  — "default" giữ chữ đen trên nền sáng. Chọn
  //                     "black-translucent" thì nội dung chui lên dưới đồng hồ.
  appleWebApp: {
    capable: true,
    title: houseConfig.shortName,
    statusBarStyle: "default",
  },

  // Safari trên iOS tự biến chuỗi số thành link gọi điện, kể cả mã phòng và số
  // CCCD — chúng bị tô xanh và bấm vào là mở trình quay số.
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Never lock zoom: some tenants rely on it to read.
  maximumScale: 5,
  // Chạy sát mép trên iPhone tai thỏ khi đã cài app. Bắt buộc để `env(safe-area-inset-*)`
  // trả về số khác 0 — thiếu nó thì thanh nav dưới của người thuê bị thanh gạt
  // Home của iOS đè lên.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1a17" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${sans.variable} ${mono.variable} h-full`}
    >
      <body className="min-h-full antialiased">
        <ThemeProvider>
          <NavProgress />
          {children}
          <Toaster position="top-center" richColors closeButton />
          <ServiceWorkerRegistration />
        </ThemeProvider>
      </body>
    </html>
  );
}
