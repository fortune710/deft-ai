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
                <Link href="#blog">Blog</Link>
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
            <span className="text-sm font-medium uppercase">Built for part-time creators who mean business</span>
          </div>

          <h1 className="mb-6 font-alan-sans flex flex-col items-center justify-center text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            <span>Your Content.</span>
            <span>On Autopilot.</span>
          </h1>

          <p className="mb-8 max-w-2xl font-lexend-deca text-lg text-muted-foreground sm:text-xl">
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

          <div className="mt-16">
            <Image
              src="/hero-image.png"
              alt='Deft Content Engine Page'
              width={100}
              height={80}
              className='w-full rounded-xl'
            />
          </div>

          <div className="py-20 w-full">
            <h2 className="font-alan-sans text-3xl font-medium max-sm:text-xl">Trusted by creators from</h2>

            <div className="mt-10 flex items-center justify-between md:px-10 lg:px-20 xl:px-36">
              <div className='w-[85px] h-[85px]'>
                <Image
                  src="/social/instagram.svg"
                  alt="Instagram"
                  width={100}
                  height={100}
                  className="rounded-md w-full h-full object-contain"
                />
              </div>
              <div className='w-28 h-28'>
                <Image
                  src="/social/youtube.svg"
                  alt="Youtube"
                  width={100}
                  height={100}
                  className="rounded-md w-full h-full object-contain"
                />
              </div>
              <div className='w-[75px] h-[75px]'>
                <Image
                  src="/social/tiktok-alt.svg"
                  alt="TikTok"
                  width={100}
                  height={100}
                  className="rounded-md w-full h-full object-contain"
                />
              </div>
              <div className='w-[100px] h-[100px]'>
                <Image
                  src="/social/linkedin.svg"
                  alt="LinkedIn"
                  width={100}
                  height={100}
                  className="rounded-md w-full h-full object-contain"
                />
              </div>
              <div className='w-20 h-20'>
                <Image
                  src="/social/X-logo-white.svg"
                  alt="X"
                  width={100}
                  height={100}
                  className="rounded-md w-full h-full object-contain"
                />
              </div>
            </div>
          </div>
        </section>


        <section>
          <div className="mb-16 text-center">
            <h2 className="font-alan-sans text-3xl font-medium max-sm:text-3xl">Join hundreds of creators reclaiming hours of work back</h2>
          </div>
          <ul className="list-none flex items-center justify-between md:px-10 lg:px-20 xl:px-36">
           <li className='bg-accent px-6 py-4 rounded-lg text-center border space-y-1'>
            <p className='font-semibold font-lexend-deca text-4xl'>10+ hours</p>
            <p className='uppercase font-lexend-deca text-sm'>saved per week</p>
           </li>

           <li className='bg-accent px-6 py-4 rounded-lg text-center border space-y-1'>
            <p className='font-semibold font-lexend-deca text-4xl'>3x increase</p>
            <p className='uppercase font-lexend-deca text-sm'>consistent posting</p>
           </li>

           <li className='bg-accent px-6 py-4 rounded-lg text-center border space-y-1'>
            <p className='font-semibold font-lexend-deca text-4xl'>30-day plans</p>
            <p className='uppercase font-lexend-deca text-sm'>generated in minutes</p>
           </li>
          </ul>
        </section>

        <section className='my-20'>
          <h2 className="text-center text-2xl font-semibold font-alan-sans sm:text-3xl md:text-4xl">Sound Familiar?</h2>
          <div className="my-16 space-y-6 text-center text-lg sm:text-xl md:text-2xl font-lexend-deca text-muted-foreground">
            <p>You&apos;re talented. But the workflow is killing you.</p>

            <p>
            You open your laptop to create — and two hours later you've been sucked into researching ideas, rewriting the same hook five times,{" "}
            figuring out what to post next, and wondering why your last video bombed. You haven't even hit record yet.{" "}
            The problem isn't your content. It's the invisible tax of doing everything manually, with no system, across a dozen disconnected tools.{" "}
            Full-time creators have teams. You have a calendar that's already full.
            </p>
          </div>


          <div className='py-12'>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3'>
              <div className='lg:col-span-2'>
                <h3 className="text-2xl font-semibold font-lexend-deca sm:text-3xl md:text-4xl">What do I even post?</h3>
                <p className='text-xl'>You spend more time planning than creating. Ideas feel random and disconnected — there's no system, just vibes.</p>
              </div>

              <p className='text-5xl'>🤔</p>
            </div>
          </div>
        </section>

        <Features/>

        <section className='py-20 space-y-10 text-center'>
          <h2 className="text-center text-2xl font-semibold font-alan-sans sm:text-3xl md:text-4xl">Introudcing Deft</h2>
          <div className='space-y-1'>
            <h3 className="text-center text-2xl font-semibold font-alan-sans sm:text-3xl md:text-4xl">One System. Every Step.</h3>
            <h2 className="text-center text-2xl font-semibold font-alan-sans sm:text-3xl md:text-4xl">Zero Guesswork.</h2>
          </div>
          
          <p className="text-lg sm:text-xl md:text-2xl font-lexend-deca text-muted-foreground">
          Deft isn't another AI writing tool. It's your always-on content operator{" "} 
          — automating the planning, scripting,{" "}
          and optimization work that eats your time and stalls your growth.
          </p>
          

          <p className="text-lg sm:text-xl md:text-2xl font-lexend-deca text-muted-foreground">
            Tell Deft about your niche, your goals, and your audience once. 
            It builds a personalized content strategy, generates a 30-day 
            multi-platform pipeline, writes scripts tuned for retention, and 
            learns from your performance data every week — getting sharper the 
            longer you use it.
            
            <br/><br/><br/>
            You stay in your zone of genius. Deft handles the rest.
          </p>
        </section>

        <section className="border-t border-border/40 py-20">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">How It Works</h2>
            <p className="text-lg text-muted-foreground">Get from zero to a month of content in 4 simple steps</p>
          </div>

          <div className="grid gap-8 md:grid-cols-4">
            <div className="text-center">
              <div className="mb-4 flex items-center justify-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-2xl font-bold text-primary">1</span>
                </div>
              </div>
              <h3 className="mb-2 font-bold">Answer 5 Questions</h3>
              <p className="text-sm text-muted-foreground">Tell us about your niche, goals, and platforms in under 5 minutes.</p>
            </div>

            <div className="text-center">
              <div className="mb-4 flex items-center justify-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-2xl font-bold text-primary">2</span>
                </div>
              </div>
              <h3 className="mb-2 font-bold">Generate Ideas</h3>
              <p className="text-sm text-muted-foreground">AI creates 200+ unique content ideas tailored to your strategy.</p>
            </div>

            <div className="text-center">
              <div className="mb-4 flex items-center justify-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-2xl font-bold text-primary">3</span>
                </div>
              </div>
              <h3 className="mb-2 font-bold">Review & Select</h3>
              <p className="text-sm text-muted-foreground">Pick your favorite ideas. AI scores them for engagement potential.</p>
            </div>

            <div className="text-center">
              <div className="mb-4 flex items-center justify-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-2xl font-bold text-primary">4</span>
                </div>
              </div>
              <h3 className="mb-2 font-bold">Get Scripts</h3>
              <p className="text-sm text-muted-foreground">Receive platform-optimized scripts ready to publish or refine.</p>
            </div>
          </div>
        </section>

        
      </main>

      <footer className="border-t border-border/40 bg-muted/30 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
            <div className="flex items-center gap-2 font-bold">
              <Image
                src="/deft-logo.png"
                alt="Deft"
                width={24}
                height={24}
                className="rounded-md"
              />
              <span>Deft</span>
            </div>
            <div className="flex flex-col gap-4 text-center text-sm text-muted-foreground sm:flex-row">
              <Link href="/login" className="hover:text-foreground transition-colors">
                Login
              </Link>
              <Link href="/sign-up" className="hover:text-foreground transition-colors">
                Sign Up
              </Link>
              <span>© 2025 Deft. All rights reserved.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
