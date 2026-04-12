import type { Metadata } from 'next';
import { DM_Sans, Bricolage_Grotesque } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Sidebar } from '@/components/nav/sidebar';
import { MobileNav } from '@/components/nav/mobile-nav';
import { Toaster } from 'sonner';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
});

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
});

export const metadata: Metadata = {
  title: 'Rich Investor',
  description: 'Personal life management — health, nutrition, habits, and more',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${dmSans.variable} ${bricolage.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full flex" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
        <ThemeProvider>
          <Sidebar />
          <main className="flex-1 min-h-screen pb-20 md:pb-0">
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
              {children}
            </div>
          </main>
          <MobileNav />
          <Toaster position="bottom-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
