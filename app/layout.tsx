import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  icons: { icon: '/favicon.svg' },
  title: '灰烬之门 · Ashen Gates',
  description:
    '选择职业，穿越数值之门，收集秘宝与誓印。从十五关高塔到六轮长夜，携火踏上登神长阶。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body>{children}</body>
    </html>
  );
}
