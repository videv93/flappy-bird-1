import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Home - Flappy Bird',
  description: 'Your reading dashboard',
};

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
