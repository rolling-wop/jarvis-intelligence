import type { Metadata } from 'next';
import './globals.css';
import Nav from '@/components/Nav';

export const metadata: Metadata = {
  title: 'RISUN — Financial Intelligence for Singapore Advisors',
  description: 'Macro intelligence platform for Singapore financial advisors. Research tool only — not personalized investment advice.',
  keywords: ['Singapore', 'financial advisor', 'IFA', 'macro', 'markets', 'RISUN'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-gray-950 text-gray-100 antialiased">
        <Nav />
        <main className="pt-14">{children}</main>
        <footer className="border-t border-gray-800 mt-12 py-6 text-center text-xs text-gray-500">
          <p>RISUN is a research and information tool for financial advisors. Not personalized investment advice.</p>
          <p className="mt-1">Data sourced from FRED, MAS, MarketAux, and public APIs. For professional use only.</p>
        </footer>
      </body>
    </html>
  );
}
