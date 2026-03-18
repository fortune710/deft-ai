"use client";

import { Button } from "@/components/ui/button";
import { motion, Variants } from "framer-motion";
import { ArrowRight, Zap, Sparkles } from "lucide-react";

const contentVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.8,
            ease: [0.16, 1, 0.3, 1],
            staggerChildren: 0.1,
        },
    },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

export default function FinalCTA() {
    return (
        <section className="relative py-48 px-4 sm:px-6 lg:px-8 overflow-hidden">
            {/* Spotlight Effect - Centered to avoid footer overlap */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[800px] bg-primary/10 rounded-full blur-[140px] opacity-40 -z-10" />

            {/* Technical Grid Background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] -z-20" />

            {/* Premium Vertical Flare */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-80 bg-gradient-to-b from-transparent via-primary/30 to-transparent -z-10" />

            <div className="max-w-4xl mx-auto relative z-10">
                <motion.div
                    variants={contentVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className="text-center space-y-12"
                >
                    {/* Centered Performance Icon */}
                    <div className="flex justify-center mb-4">
                        <motion.div
                            animate={{
                                scale: [1, 1.15, 1],
                                opacity: [0.3, 0.7, 0.3]
                            }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            className="relative"
                        >
                            <Zap className="w-16 h-16 text-primary fill-primary/10" />
                            <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-primary animate-pulse" />
                        </motion.div>
                    </div>

                    <motion.div variants={itemVariants} className="space-y-6">
                        <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold font-alan-sans tracking-tight leading-[0.95] text-balance">
                            Your audience isn&apos;t waiting. <br />
                            <span className="text-primary italic">Are you?</span>
                        </h2>
                        <p className="text-xl md:text-2xl font-lexend-deca text-muted-foreground/80 max-w-2xl mx-auto leading-relaxed text-balance">
                            Stop letting a broken workflow be the reason you&apos;re not growing.
                            Deft gives you the system to create consistently and convert effectively.
                        </p>
                    </motion.div>

                    <motion.div
                        variants={itemVariants}
                        className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4"
                    >
                        <Button
                            size="lg"
                            className="h-16 px-12 rounded-xl text-lg font-bold font-alan-sans bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/30 group transition-all hover:scale-105 active:scale-95"
                        >
                            Start Your Engine
                            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="h-16 px-12 rounded-xl text-lg font-bold font-alan-sans bg-muted/20 border-border/60 hover:bg-muted/40 transition-all hover:scale-105 active:scale-95 backdrop-blur-sm"
                        >
                            View Demo
                        </Button>
                    </motion.div>

                    <motion.div
                        variants={itemVariants}
                        className="space-y-4 pt-10"
                    >
                        <p className="text-sm font-lexend-deca text-muted-foreground/50 tracking-wide uppercase font-bold">
                            No credit card needed · Instant Setup
                        </p>
                        <div className="flex justify-center">
                            <div className="h-px w-24 bg-gradient-to-r from-transparent via-border to-transparent" />
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
