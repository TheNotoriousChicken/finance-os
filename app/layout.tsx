
import type { Metadata, Viewport } from 'next';


import './tailwind-built.css';



export const metadata: Metadata = {
  title: 'Finance OS',
  description: 'Your personal financial operating system',
  manifest: '/manifest.json',
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
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').catch(function() {});
            });
          }
        `}} />
      </head>
      <body className="font-sans antialiased text-[#FAFAFA]">
        {children}
      </body>
    </html>
  );
}
