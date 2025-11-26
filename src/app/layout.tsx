import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Foundry - Technical Specification Constructor',
  description:
    'CLI-based technical specification constructor with AI-driven Q&A and visual artifacts',
  generator: 'Next.js 14',
  robots: 'index, follow',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
