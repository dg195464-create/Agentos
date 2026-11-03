import './globals.css';
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { MetricsProvider } from '@/lib/metrics-context';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'AgentOS — Your 24/7 Autonomous Online Worker',
  description:
    'AgentOS is a pre-cognitive cloud worker platform that automates any profession with autonomous AI agents, quantum-resistant security, and sovereign cloud infrastructure.',
  openGraph: {
    title: 'AgentOS — Your 24/7 Autonomous Online Worker',
    description:
      'Pre-cognitive cloud workers for any profession. Quantum-resistant. Zero-knowledge. Sovereign.',
    images: [
      {
        url: 'https://bolt.new/static/og_default.png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: [
      {
        url: 'https://bolt.new/static/og_default.png',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrains.variable} font-sans`}>
        <AuthProvider>
          <MetricsProvider>{children}</MetricsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
