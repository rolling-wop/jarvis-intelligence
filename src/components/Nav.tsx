'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { BarChart3, Globe, Newspaper, TrendingUp, FileText, Menu, X } from 'lucide-react';

const links = [
  { href: '/', label: 'Dashboard', icon: BarChart3 },
  { href: '/macro', label: 'Macro', icon: TrendingUp },
  { href: '/news', label: 'News', icon: Newspaper },
  { href: '/singapore', label: '🇸🇬 Singapore', icon: Globe },
  { href: '/brief', label: '📋 Morning Brief', icon: FileText },
];

export default function Nav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-gray-950/95 backdrop-blur border-b border-gray-800 h-14">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-blue-400 font-bold text-xl tracking-tight">RISUN</span>
          <span className="text-gray-500 text-xs hidden sm:block">Financial Intelligence</span>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                pathname === href
                  ? 'bg-blue-500/20 text-blue-400 font-medium border border-blue-500/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
            >
              <Icon size={14} />
              <span>{label}</span>
            </Link>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-gray-400 hover:text-white p-1"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className="hidden md:block text-xs text-gray-600">Research Only · Not Advice</div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden bg-gray-950/98 border-b border-gray-800 px-4 pb-3 pt-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-md text-sm transition-colors mb-1 ${
                pathname === href
                  ? 'bg-blue-500/20 text-blue-400 font-medium'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
            >
              <Icon size={14} />
              <span>{label}</span>
            </Link>
          ))}
          <div className="text-xs text-gray-600 text-center mt-2 pt-2 border-t border-gray-800">
            Research Only · Not Financial Advice
          </div>
        </div>
      )}
    </nav>
  );
}
