import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  icons: { icon: '/favicon.svg' },
  title: '灰烬之门 · Ashen Gates',
  description:
    '选择你的职业，穿越数值之门，收集秘宝与天赋，征服十二层高塔。中世纪奇幻风格的选门跑酷肉鸽游戏。',
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
