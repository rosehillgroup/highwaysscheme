import type { Metadata } from 'next';
import { Overpass, Source_Sans_3 } from 'next/font/google';
import './globals.css';

const overpass = Overpass({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['300', '400', '600', '700'],
});

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Highways Scheme Planner',
  description: 'Plan highways schemes with accurate product placement on real road corridors',
  keywords: ['highways', 'scheme planner', 'traffic calming', 'cycle lanes', 'road design'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${overpass.variable} ${sourceSans.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
