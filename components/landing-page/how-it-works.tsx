"use client";

import { motion, Variants } from "framer-motion";
import { CheckCircle2, Layout, Zap, ArrowDown } from "lucide-react";

const steps = [
    {
        number: "01",
        title: "Tell Deft About You",
        duration: "~10 minutes",
        description: "Answer a few targeted questions about your niche, audience, goals, and content style. Deft uses this to build your Niche DNA profile — the foundation everything else is built on.",
        icon: <Zap className="w-6 h-6 text-primary" />,
    },
    {
        number: "02",
        title: "Get Your 30-Day Pipeline",
        duration: "Instant Generate",
        description: "Deft generates a complete, cross-platform content plan with hooks, scripts, and CTAs — personalized to your voice and optimized for your platform of choice.",
        icon: <Layout className="w-6 h-6 text-primary" />,
    },
    {
        number: "03",
        title: "Publish, Learn, Repeat",
        duration: "Every Week",
        description: "As you create and publish, Deft tracks performance, feeds insights back into future content, and gets smarter every week. The more you use it, the better it gets.",
        icon: <CheckCircle2 className="w-6 h-6 text-primary" />,
    },
];

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.2,
        },
    },
};

const stepVariants: Variants = {
    inactive: {
        opacity: 0.3,
        scale: 0.95,
        filter: "brightness(0.5) grayscale(100%) blur(2px)",
    },
    active: {
        opacity: 1,
        scale: 1,
        filter: "brightness(1) grayscale(0%) blur(0px)",
        transition: {
            duration: 0.6,
            ease: [0.16, 1, 0.3, 1],
        }
    },
};

export default function HowItWorks() {
    return (
        <section className="relative py-32 px-4 sm:px-6 lg:px-8 overflow-hidden" id="how-it-works">
            {/* Visual connector line in background */}
            <div className="absolute left-1/2 top-[30%] bottom-[10%] w-px bg-gradient-to-b from-primary/20 via-primary/10 to-transparent -z-10 hidden lg:block" />

            <div className="max-w-5xl mx-auto relative">
                <div className="text-center mb-24 space-y-4">
                    <motion.span
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-primary font-bold tracking-[0.2em] uppercase text-sm block"
                    >
                        Simple by design
                    </motion.span>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-6xl font-bold font-alan-sans tracking-tight"
                    >
                        From scattered to systemized <br className="hidden md:block" /> in 3 steps.
                    </motion.h2>
                </div>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className="space-y-12 lg:space-y-24"
                >
                    {steps.map((step, index) => (
                        <motion.div
                            key={index}
                            variants={stepVariants}
                            initial="inactive"
                            whileInView="active"
                            viewport={{ amount: 0.7, margin: "-10% 0px -10% 0px" }}
                            className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center group"
                        >
                            {/* Step Number for Desktop */}
                            <div className="hidden lg:flex lg:col-span-2 justify-center">
                                <span className="text-7xl font-bold font-alan-sans text-primary/10 group-hover:text-primary/20 transition-colors tracking-tighter">
                                    {step.number}
                                </span>
                            </div>

                            {/* Main Card */}
                            <div className="lg:col-span-8 relative p-8 md:p-12 rounded-[2rem] border border-border/40 bg-muted/10 backdrop-blur-md shadow-2xl shadow-primary/5 transition-all">
                                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                                            {step.icon}
                                        </div>
                                        <h3 className="text-2xl md:text-3xl font-bold font-alan-sans tracking-tight">
                                            {step.title}
                                        </h3>
                                    </div>
                                    <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-xs font-bold font-lexend-deca text-primary/80 uppercase tracking-widest">
                                        {step.duration}
                                    </span>
                                </div>
                                <p className="text-lg md:text-xl font-lexend-deca text-muted-foreground/90 leading-relaxed max-w-3xl">
                                    {step.description}
                                </p>
                            </div>

                            {/* Visual indicator for next step (desktop) */}
                            {index < steps.length - 1 && (
                                <div className="hidden lg:flex lg:col-span-2 justify-center">
                                    <motion.div
                                        animate={{ y: [0, 10, 0] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    >
                                        <ArrowDown className="w-8 h-8 text-primary/20" />
                                    </motion.div>
                                </div>
                            )}

                            {/* Redundant Step Number for Mobile */}
                            <div className="lg:hidden absolute -top-4 -left-4 w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white font-bold shadow-xl">
                                {index + 1}
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
