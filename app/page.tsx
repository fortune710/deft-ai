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
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Image
              src="/deft-logo.png"
              alt="Deft"
              width={32}
              height={32}
              className="rounded-md"
            />
            <span>Deft</span>
          </div>
          <div className="flex gap-4">
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
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <section className="flex min-h-[calc(100vh-80px)] flex-col items-center justify-center py-16 text-center">
          <div className="mb-6 inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-2">
            <Rocket className="mr-2 size-4 text-primary" />
            <span className="text-sm font-medium">AI-Powered Content Creation</span>
          </div>

          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Create Scroll-Stopping Content in Minutes
          </h1>

          <p className="mb-8 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Discover your niche, generate 200+ content ideas, and get platform-specific scripts—all powered by AI. From
            Twitter threads to TikTok scripts, we've got you covered.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" asChild className="gap-2">
              <Link href="/sign-up">
                Get Started Free
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Watch Demo</Link>
            </Button>
          </div>

          <div className="mt-16 grid grid-cols-3 gap-8 text-left">
            <div>
              <p className="text-2xl font-bold">200+</p>
              <p className="text-sm text-muted-foreground">Ideas per plan</p>
            </div>
            <div>
              <p className="text-2xl font-bold">6</p>
              <p className="text-sm text-muted-foreground">Platforms supported</p>
            </div>
            <div>
              <p className="text-2xl font-bold">&lt;5min</p>
              <p className="text-sm text-muted-foreground">Setup time</p>
            </div>
          </div>
        </section>

        <section className="border-t border-border/40 py-20">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">Powerful Features</h2>
            <p className="text-lg text-muted-foreground">Everything you need to build a thriving content strategy</p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-border/40 bg-muted/30 p-6 transition-all hover:border-primary/40 hover:bg-muted/50">
              <Brain className="mb-4 size-8 text-primary" />
              <h3 className="mb-2 font-bold">AI-Powered Ideas</h3>
              <p className="text-sm text-muted-foreground">
                Generate 200+ unique content ideas tailored to your niche, audience, and platforms.
              </p>
            </div>

            <div className="rounded-lg border border-border/40 bg-muted/30 p-6 transition-all hover:border-primary/40 hover:bg-muted/50">
              <Zap className="mb-4 size-8 text-primary" />
              <h3 className="mb-2 font-bold">Instant Scripts</h3>
              <p className="text-sm text-muted-foreground">
                Get platform-optimized scripts for Twitter, TikTok, Instagram, YouTube, LinkedIn, and Facebook.
              </p>
            </div>

            <div className="rounded-lg border border-border/40 bg-muted/30 p-6 transition-all hover:border-primary/40 hover:bg-muted/50">
              <Target className="mb-4 size-8 text-primary" />
              <h3 className="mb-2 font-bold">Smart Scheduling</h3>
              <p className="text-sm text-muted-foreground">
                Organize content with calendar and board views. Plan weeks of posts in one session.
              </p>
            </div>

            <div className="rounded-lg border border-border/40 bg-muted/30 p-6 transition-all hover:border-primary/40 hover:bg-muted/50">
              <BarChart3 className="mb-4 size-8 text-primary" />
              <h3 className="mb-2 font-bold">Video Analytics</h3>
              <p className="text-sm text-muted-foreground">
                Upload videos and get AI-powered feedback on hooks, content quality, and engagement potential.
              </p>
            </div>

            <div className="rounded-lg border border-border/40 bg-muted/30 p-6 transition-all hover:border-primary/40 hover:bg-muted/50">
              <Clock className="mb-4 size-8 text-primary" />
              <h3 className="mb-2 font-bold">AI Script Editor</h3>
              <p className="text-sm text-muted-foreground">
                Refine and iterate scripts with our intelligent editor. Chat with AI to perfect your content.
              </p>
            </div>

            <div className="rounded-lg border border-border/40 bg-muted/30 p-6 transition-all hover:border-primary/40 hover:bg-muted/50">
              <Sparkles className="mb-4 size-8 text-primary" />
              <h3 className="mb-2 font-bold">Content Strategy</h3>
              <p className="text-sm text-muted-foreground">
                Get personalized content pillars, tone guidance, and reference creators for your niche.
              </p>
            </div>
          </div>
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

        <section className="border-t border-border/40 py-20">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-8 text-center sm:p-12">
            <h2 className="mb-4 text-3xl font-bold">Join Creators Getting Results</h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Stop staring at a blank page. Start creating content that gets attention.
            </p>
            <Button size="lg" asChild className="gap-2">
              <Link href="/sign-up">
                Create Your First Plan
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <p className="mt-6 text-sm text-muted-foreground">No credit card required. Free for 7 days.</p>
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
              <span>Content Engine</span>
            </div>
            <div className="flex flex-col gap-4 text-center text-sm text-muted-foreground sm:flex-row">
              <Link href="/login" className="hover:text-foreground transition-colors">
                Login
              </Link>
              <Link href="/sign-up" className="hover:text-foreground transition-colors">
                Sign Up
              </Link>
              <span>© 2025 Content Engine. All rights reserved.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
