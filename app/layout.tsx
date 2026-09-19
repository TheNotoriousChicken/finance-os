
import type { Metadata, Viewport } from 'next';

import './tailwind-built.css';

export const metadata: Metadata = {
  title: 'Finance OS',
  description: 'Your personal financial operating system',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0A0A0A',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="font-sans antialiased  text-[#FAFAFA]">
        {children}
      </body>
    </html>
  );
}
