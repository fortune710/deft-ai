import './globals.css';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { QueryProvider } from '@/components/query-provider';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { PHProvider, PostHogPageView } from '@/lib/posthog/provider';
import { cn } from '@/lib/utils';
import { alanSans, lexendDeca, inter } from '@/lib/fonts';
import { ConvexClientProvider } from '@/components/convex-client-provider';
import { logger } from '@/lib/logger.server';
import { ClerkProvider } from '@clerk/nextjs';

const log = logger.child({ module: 'app/layout' });

export const metadata: Metadata = {
  title: 'Deft - The AI Operator for Modern Creators',
  description: 'Discover your niche and automate content creation with AI',
  openGraph: {
    images: [
      {
        url: '/deft-banner.png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: [
      {
        url: '/deft-banner.png',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  log.debug('Rendering root layout', {
    userId: 'not_available',
    action: 'render_root_layout',
  });

  return (
    <ClerkProvider signInUrl="/login" signUpUrl="/sign-up">
      <html lang="en" suppressHydrationWarning>
        <body className={`${inter.variable} ${alanSans.variable} ${lexendDeca.variable}`}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            <PHProvider>
              <ConvexClientProvider>
                <QueryProvider>
                  <Suspense fallback={null}>
                    <PostHogPageView />
                  </Suspense>
                  {children}
                  <Toaster />
                  <SonnerToaster position="top-right" />
                </QueryProvider>
              </ConvexClientProvider>
            </PHProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
