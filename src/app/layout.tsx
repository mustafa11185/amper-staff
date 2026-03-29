import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "أمبير — تطبيق الموظفين",
  description: "تطبيق الجابي والمشغل",
  manifest: "/manifest.json",
  themeColor: "#1B4FD8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="h-full">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&family=Rajdhani:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col" style={{ background: "var(--bg-base)" }}>
        {children}
      </body>
    </html>
  );
}
