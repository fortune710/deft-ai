import Features from '@/components/landing-page/features';
import FrequentlyAskedQuestions from '@/components/landing-page/frequently-asked-questions';
import FinalCTA from '@/components/landing-page/final-cta';
import Footer from '@/components/landing-page/footer';
import PainPoints from '@/components/landing-page/painpoints';
import Solution from '@/components/landing-page/solution';
import HowItWorks from '@/components/landing-page/how-it-works';
import Comparison from '@/components/landing-page/comparison';
import Navbar from '@/components/landing-page/navbar';
import Hero from '@/components/landing-page/hero';
import Stats from '@/components/landing-page/stats';

export default function Home() {

  return (
    <div className="w-full bg-gradient-to-b from-background via-background to-muted/20">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Hero />
        <Stats />

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
