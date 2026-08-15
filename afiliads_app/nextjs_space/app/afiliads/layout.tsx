import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import '../../tokens.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--af-inter',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--af-space-grotesk',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AfiliAds — Operação de mídia para afiliados',
  description:
    'Da análise da oferta ao aprendizado de campanha: agentes de IA, regras determinísticas e Google Ads em um único fluxo operacional.',
  openGraph: {
    title: 'AfiliAds — Campanhas de afiliados, sob controle',
    description:
      'Um sistema operacional para afiliados e agências pesquisarem, publicarem e aprenderem com campanhas verificáveis.',
    type: 'website',
  },
};

export default function AfiliAdsLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${inter.variable} ${spaceGrotesk.variable}`}>{children}</div>;
}
