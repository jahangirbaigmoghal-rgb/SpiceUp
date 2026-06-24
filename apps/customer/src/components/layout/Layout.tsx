import type { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { useSettings } from '../../hooks/useSettings';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { settings } = useSettings();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans relative overflow-x-hidden">
      {/* Skip link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand-500 focus:text-white focus:rounded-lg focus:text-sm focus:font-bold"
      >
        Skip to main content
      </a>

      <Header settings={settings} />

      <main id="main-content" className="flex-1 w-full">
        {children}
      </main>

      <Footer settings={settings} />
    </div>
  );
}
