'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function Hero() {
    return (
        <section className="flex min-h-[calc(100vh-80px)] flex-col items-center justify-center py-16 text-center">
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="flex flex-col items-center"
            >
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

                <div className="flex flex-col max-sm:w-full gap-4 sm:flex-row sm:justify-center">
                    <Button size="lg" asChild className="gap-2 text-lg font-semibold font-alan-sans md:px-10 md:py-6">
                        <Link href="/sign-up">
                            Start For Free
                            <ArrowRight className="size-4" />
                        </Link>
                    </Button>
                    <Button className='text-lg font-semibold font-alan-sans md:px-10 md:py-6' size="lg" variant="outline" asChild>
                        <Link href="/login">Watch Demo</Link>
                    </Button>
                </div>
            </motion.div>

            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                className="mt-16 w-full max-w-6xl mx-auto"
            >
                <Image
                    src="/hero-image.png"
                    alt='Deft Content Ideas Page'
                    width={1200}
                    height={800}
                    className='w-full rounded-2xl shadow-2xl border border-primary/10'
                />
            </motion.div>

            <div className="py-24 w-full">
                <h2 className="font-alan-sans text-3xl font-medium max-sm:text-xl text-center">Trusted by creators from</h2>

                <div className="mt-12 grid grid-cols-2 md:flex md:flex-wrap items-center justify-center gap-12 md:gap-24">
                    <div className='flex justify-center'>
                        <div className='w-12 h-12 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all'>
                            <Image
                                src="/social/instagram.svg"
                                alt="Instagram"
                                width={48}
                                height={48}
                                className="w-full h-full object-contain"
                            />
                        </div>
                    </div>
                    <div className='flex justify-center'>
                        <div className='w-16 h-16 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all'>
                            <Image
                                src="/social/youtube.svg"
                                alt="Youtube"
                                width={64}
                                height={64}
                                className="w-full h-full object-contain"
                            />
                        </div>
                    </div>
                    <div className='flex justify-center'>
                        <div className='w-10 h-10 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all'>
                            <Image
                                src="/social/tiktok-alt.svg"
                                alt="TikTok"
                                width={40}
                                height={40}
                                className="w-full h-full object-contain"
                            />
                        </div>
                    </div>
                    <div className='flex justify-center'>
                        <div className='w-14 h-14 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all'>
                            <Image
                                src="/social/linkedin.svg"
                                alt="LinkedIn"
                                width={56}
                                height={56}
                                className="w-full h-full object-contain"
                            />
                        </div>
                    </div>
                    <div className='max-md:col-span-2 flex justify-center'>
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
            </div>
        </section>
    );
}
