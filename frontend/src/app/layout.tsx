import type { Metadata } from 'next';
import { Background3D } from '../components/Background3D';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import './globals.css';

export const metadata: Metadata = {
  title: 'Jano HD - Download YouTube & Instagram Videos in Full HD',
  description:
    'Download YouTube Videos, Shorts, and Instagram Reels in original 1080p Full HD resolution quickly and securely with Jano HD.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-slate-50 text-slate-900 min-h-screen flex flex-col antialiased font-sans relative">
        <Background3D />
        <Header />
        <main className="flex-1 w-full px-4 sm:px-6 py-6 sm:py-10">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
