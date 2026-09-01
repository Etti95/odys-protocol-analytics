import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ODYS Protocol Analytics',
  description:
    'Onchain volume, protocol revenue, annualized run rate, markets, buybacks and burned ODYS supply on Arbitrum One.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
