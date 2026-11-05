import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "书中人",
  description: "上传书籍，生成作者与角色分身并对话。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${body.variable} h-full antialiased`}>
      <body className="h-dvh overflow-hidden">{children}</body>
    </html>
  );
}
