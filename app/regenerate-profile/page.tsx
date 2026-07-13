'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import {
    Rocket,
    Sparkles,
    ArrowLeft,
    Zap,
    ShieldCheck,
    Cpu,
    Globe2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function RegenerateProfilePage() {
    const router = useRouter();

    return (
        <AppLayout>
            <div className="relative min-h-[calc(100vh-120px)] flex flex-col items-center justify-center py-12 px-6 overflow-hidden">

                {/* Background Decorative Elements */}
                <div className="absolute inset-0 -z-10 pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
                    <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse delay-700" />
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]" />
                </div>

                <div className="max-w-4xl w-full space-y-12">
                    {/* Back Button */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Button
                            variant="ghost"
                            onClick={() => router.back()}
                            className="group text-muted-foreground hover:text-foreground font-lexend-deca rounded-xl"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                            Back to Profile
                        </Button>
                    </motion.div>

                    {/* Main Hero Section */}
                    <div className="text-center space-y-8">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-4"
                        >
                            <Zap className="w-4 h-4 fill-current" />
                            <span className="text-xs font-black uppercase tracking-[0.3em] font-lexend-deca">Coming Soon</span>
                        </motion.div>

                        <motion.h1
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.8 }}
                            className="text-5xl md:text-7xl font-bold tracking-tight font-alan-sans leading-tight"
                        >
                            The Next Era of <br />
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-indigo-400 to-purple-500">
                                Strategy Regeneration
                            </span>
                        </motion.h1>

                        <motion.p
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4, duration: 0.8 }}
                            className="max-w-2xl mx-auto text-muted-foreground text-lg md:text-xl font-inter leading-relaxed"
                        >
                            We're rebuilding our niche discovery engine from the ground up. Get ready for
                            real-time market analysis, competitor mapping, and adaptive content pillars.
                        </motion.p>
                    </div>

                    {/* Features Grid Preview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            {
                                icon: Cpu,
                                title: 'Core Refresh 2.0',
                                desc: 'Nuanced strategy updates that grow alongside your audience analytics.',
                                color: 'text-blue-400'
                            },
                            {
                                icon: ShieldCheck,
                                title: 'Data Preservation',
                                desc: 'Safely pivot your niche without losing your existing content context.',
                                color: 'text-emerald-400'
                            },
                            {
                                icon: Globe2,
                                title: 'Market Signal',
                                desc: 'Ingest trending topics directly into your redefined content strategy.',
                                color: 'text-amber-400'
                            }
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ y: 30, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.6 + i * 0.1, duration: 0.5 }}
                            >
                                <Card className="h-full bg-card/40 border-border/40 backdrop-blur-md hover:border-primary/40 transition-colors group">
                                    <CardContent className="p-8 space-y-4">
                                        <div className={cn("p-3 rounded-xl bg-muted/20 w-fit", feature.color)}>
                                            <feature.icon className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-lg font-bold font-lexend-deca">{feature.title}</h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed font-inter">
                                            {feature.desc}
                                        </p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>

                    {/* Call to Action Box */}
                    <motion.div
                        initial={{ y: 40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 1, duration: 0.8 }}
                        className="p-1 gap-1 flex flex-col md:flex-row items-center justify-between rounded-3xl bg-primary/5 border border-primary/20 backdrop-blur-xl max-w-2xl mx-auto overflow-hidden shadow-2xl"
                    >
                        <div className="flex-1 py-6 px-8 space-y-1">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80 font-lexend-deca">Status: In Development</h4>
                            <p className="text-sm font-semibold font-alan-sans">Stay tuned for the official roll-out this spring.</p>
                        </div>
                        <Button
                            className="m-2 rounded-2xl h-12 px-8 font-bold font-lexend-deca bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                            onClick={() => router.push('/settings/profile')}
                        >
                            Notify Me
                        </Button>
                    </motion.div>

                    {/* Floating Icon */}
                    <motion.div
                        animate={{
                            y: [0, -15, 0],
                            rotate: [0, 5, 0]
                        }}
                        transition={{
                            duration: 6,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="absolute top-1/2 right-10 opacity-20 pointer-events-none hidden xl:block"
                    >
                        <Rocket className="w-48 h-48 text-primary" />
                    </motion.div>
                </div>
            </div>
        </AppLayout>
    );
}
