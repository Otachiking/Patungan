import type { Metadata } from 'next';
import './globals.css';
import { I18nProvider } from '@/i18n';
import { LanguageToggle } from '@/components/LanguageToggle';

export const metadata: Metadata = {
  title: 'PtPtLah — Patungan Per-Item',
  description:
    'Hitung patungan per-item secara adil. Siapa pesan apa, langsung dihitung dari situ. Bukan dibagi rata.',
  keywords: ['patungan', 'split bill', 'hitung bersama', 'struk', 'PPN restoran'],
  openGraph: {
    title: 'PtPtLah — Patungan Per-Item',
    description: 'Hitung patungan per-item secara adil. Bukan dibagi rata.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <I18nProvider>
          {children}
          <LanguageToggle />
        </I18nProvider>
      </body>
    </html>
  );
}
