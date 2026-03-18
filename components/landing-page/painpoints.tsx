"use client";

import { motion, Variants } from "framer-motion";
import { HelpCircle, UserX, BatteryMedium, AlertCircle } from "lucide-react";

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15,
        },
    },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.6,
            ease: [0.16, 1, 0.3, 1],
        },
    },
};

const difficulties = [
    {
        icon: <HelpCircle className="w-8 h-8 text-primary" />,
        title: "What do I even post?",
        description: "You spend more time planning than creating. Ideas feel random and disconnected — there's no system, just vibes.",
    },
    {
        icon: <UserX className="w-8 h-8 text-primary" />,
        title: "This AI output sounds nothing like me.",
        description: "Generic AI tools generate generic content. They don't know your niche, your voice, or what actually converts for your audience.",
    },
    {
        icon: <BatteryMedium className="w-8 h-8 text-primary" />,
        title: "I post consistently for 2 weeks, then burn out.",
        description: "Without a pipeline, consistency is willpower-dependent. Willpower always runs out.",
    },
];

export default function PainPoints() {
    return (
        <section className="relative py-32 overflow-hidden" id="pain-points">
            {/* Subtle background glow to create mood */}
            <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -z-10" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-24"
                >
                    <h2 className="text-4xl md:text-6xl font-bold font-alan-sans tracking-tight mb-8">
                        Sound Familiar?
                    </h2>
                    <div className="max-w-4xl mx-auto space-y-8 text-xl md:text-2xl font-lexend-deca text-muted-foreground/80 leading-relaxed">
                        <p className="italic underline decoration-primary/30 underline-offset-8">
                            You&apos;re talented. But the workflow is killing you.
                        </p>

                        <p>
                            You open your laptop to create — and two hours later you&apos;ve been sucked into researching ideas, rewriting the same hook five times,{" "}
                            figuring out what to post next, and wondering why your last video bombed.
                        </p>
                        <p className="text-foreground font-semibold">
                            Full-time creators have teams. You have a calendar that&apos;s already full.
                        </p>
                    </div>
                </motion.div>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-8"
                >
                    {difficulties.map((item, index) => (
                        <motion.div
                            key={index}
                            variants={itemVariants}
                            className="group relative p-8 rounded-3xl border border-border/40 bg-muted/10 backdrop-blur-sm transition-all hover:bg-muted/20 hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5"
                        >
                            {/* Stress Accent line */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="mb-6 inline-flex p-3 rounded-2xl bg-primary/5 border border-primary/10">
                                {item.icon}
                            </div>

                            <h3 className="text-xl font-bold font-alan-sans mb-4 group-hover:text-primary transition-colors">
                                {item.title}
                            </h3>

                            <p className="font-lexend-deca text-muted-foreground leading-relaxed">
                                {item.description}
                            </p>

                            <div className="mt-8 flex items-center gap-2 text-[10px] font-bold font-alan-sans uppercase tracking-[0.2em] text-muted-foreground/30">
                                <AlertCircle className="w-3 h-3" />
                                Critical Friction
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}