import type { Metadata, Viewport } from "next";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import { themeInitScript } from "@/lib/theme";

export const metadata: Metadata = {
  title: "오늘의길",
  description: "오늘 걷기 좋은 길을 추천해주는 산책 코스 앱",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#f8f9f6",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="icon" href="/assets/leaf-logo.png" data-theme-icon="" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body><ThemeProvider>{children}</ThemeProvider></body>
    </html>
  );
}
