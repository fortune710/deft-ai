import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  Zap,
  Brain,
  Rocket,
  BarChart3,
  Clock,
  Target,
  ArrowRight,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Features from '@/components/landing-page/features';
import FrequentlyAskedQuestions from '@/components/landing-page/frequently-asked-questions';
import FinalCTA from '@/components/landing-page/final-cta';
import Footer from '@/components/landing-page/footer';
import PainPoints from '@/components/landing-page/painpoints';
import Solution from '@/components/landing-page/solution';
import HowItWorks from '@/components/landing-page/how-it-works';
import Comparison from '@/components/landing-page/comparison';

const AuthNavButtons = dynamic(() => import('@/components/auth-nav-buttons').then(mod => ({ default: mod.AuthNavButtons })), {
  loading: () => (
    <div className="flex gap-4">
      <Skeleton className="h-10 w-20 rounded-md" />
      <Skeleton className="h-10 w-24 rounded-md" />
    </div>
  ),
});

export default function Home() {

  return (
    <div className="w-full bg-gradient-to-b from-background via-background to-muted/20">
      <nav className="sticky top-0 z-50">
        <div className="mx-auto flex w-[90%] items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className='bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center gap-7 border rounded-xl p-2'>
            <div className="flex items-center gap-2 font-semibold text-lg">
              <Image
                src="/deft-logo.png"
                alt="Deft"
                width={32}
                height={32}
                className="rounded-md"
              />
              <span className='font-lexend-deca'>Deft</span>
            </div>

            <ul className='flex items-center gap-1 list-none font-alan-sans font-medium'>
              <li className='px-3 py-1.5 hover:bg-accent/40 rounded-lg'>
                <Link href="#features">Features</Link>
              </li>
              <li className='px-3 py-1.5 hover:bg-accent/40 rounded-lg'>
                <Link href="#how-it-works">How it works</Link>
              </li>
              <li className='px-3 py-1.5 hover:bg-accent/40 rounded-lg'>
                <Link href="#pricing">Pricing</Link>
              </li>
            </ul>

          </div>

          <Suspense
            fallback={
              <div className="flex gap-4">
                <Skeleton className="h-10 w-20 rounded-md" />
                <Skeleton className="h-10 w-24 rounded-md" />
              </div>
            }
          >
            <AuthNavButtons />
          </Suspense>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <section className="flex min-h-[calc(100vh-80px)] flex-col items-center justify-center py-16 text-center">
          <div className="mb-6 px-4 py-2">
            <span className="text-primary font-bold tracking-[0.2em] uppercase text-sm block">Built for part-time creators who mean business</span>
          </div>

          <h1 className="mb-6 font-alan-sans flex flex-col items-center justify-center text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl text-center">
            <span>Your Content.</span>
            <span>On Autopilot.</span>
          </h1>

          <p className="mb-8 max-w-2xl font-lexend-deca text-lg text-muted-foreground sm:text-xl text-center">
            Deft is the AI operator that plans, scripts, and optimizes your content
            pipeline — so you can grow your audience without sacrificing your day job.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" asChild className="gap-2">
              <Link href="/sign-up">
                Start For Free
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Watch Demo</Link>
            </Button>
          </div>

          <div className="mt-16 w-full max-w-6xl mx-auto">
            <Image
              src="/hero-image.png"
              alt='Deft Content Engine Page'
              width={1200}
              height={800}
              className='w-full rounded-2xl shadow-2xl border border-primary/10'
            />
          </div>

          <div className="py-24 w-full">
            <h2 className="font-alan-sans text-3xl font-medium max-sm:text-xl text-center">Trusted by creators from</h2>

            <div className="mt-12 flex flex-wrap items-center justify-center gap-12 md:gap-24">
              <div className='w-12 h-12 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all'>
                <Image
                  src="/social/instagram.svg"
                  alt="Instagram"
                  width={48}
                  height={48}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className='w-16 h-16 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all'>
                <Image
                  src="/social/youtube.svg"
                  alt="Youtube"
                  width={64}
                  height={64}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className='w-10 h-10 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all'>
                <Image
                  src="/social/tiktok-alt.svg"
                  alt="TikTok"
                  width={40}
                  height={40}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className='w-14 h-14 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all'>
                <Image
                  src="/social/linkedin.svg"
                  alt="LinkedIn"
                  width={56}
                  height={56}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className='w-12 h-12 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all'>
                <Image
                  src="/social/X-logo-white.svg"
                  alt="X"
                  width={48}
                  height={48}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>
        </section>


        <section className="py-24">
          <div className="mb-20 text-center">
            <h2 className="font-alan-sans text-4xl md:text-5xl font-bold tracking-tight">Join hundreds of creators reclaiming <br className="hidden md:block" /> hours of work back</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className='bg-muted/20 backdrop-blur-sm px-8 py-10 rounded-2xl border border-border/40 text-center space-y-2 hover:bg-muted/30 transition-colors'>
              <p className='font-bold font-lexend-deca text-5xl text-primary'>10+ hours</p>
              <p className='uppercase font-alan-sans text-xs tracking-widest font-bold text-muted-foreground'>saved per week</p>
            </div>

            <div className='bg-muted/20 backdrop-blur-sm px-8 py-10 rounded-2xl border border-border/40 text-center space-y-2 hover:bg-muted/30 transition-colors'>
              <p className='font-bold font-lexend-deca text-5xl text-primary'>3x increase</p>
              <p className='uppercase font-alan-sans text-xs tracking-widest font-bold text-muted-foreground'>consistent posting</p>
            </div>

            <div className='bg-muted/20 backdrop-blur-sm px-8 py-10 rounded-2xl border border-border/40 text-center space-y-2 hover:bg-muted/30 transition-colors'>
              <p className='font-bold font-lexend-deca text-5xl text-primary'>30-day plans</p>
              <p className='uppercase font-alan-sans text-xs tracking-widest font-bold text-muted-foreground'>generated in minutes</p>
            </div>
          </div>
        </section>

        <PainPoints />
        <Solution />

        <Features />

        <HowItWorks />

        <Comparison />

        <FrequentlyAskedQuestions />
        <FinalCTA />

      </main>

      <Footer />
    </div>
  );
}
