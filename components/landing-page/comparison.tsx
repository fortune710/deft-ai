"use client";

import { motion } from "framer-motion";
import { Check, X, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const comparisonData = [
    {
        feature: "Built for solo creators",
        deft: "check",
        generic: "cross",
        suite: "cross",
    },
    {
        feature: "Full workflow automation",
        deft: "check",
        generic: "cross",
        suite: "partial",
    },
    {
        feature: "Personalized to your niche & voice",
        deft: "check",
        generic: "cross",
        suite: "cross",
    },
    {
        feature: "Performance feedback loop",
        deft: "check",
        generic: "cross",
        suite: "partial",
    },
    {
        feature: "30-day content pipeline",
        deft: "check",
        generic: "cross",
        suite: "cross",
    },
    {
        feature: "Gets smarter over time",
        deft: "check",
        generic: "cross",
        suite: "cross",
    },
];

const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
        case "check":
            return (
                <div className="flex justify-center">
                    <div className="bg-primary/20 p-1.5 rounded-full ring-4 ring-primary/5">
                        <Check className="w-5 h-5 text-primary stroke-[3]" />
                    </div>
                </div>
            );
        case "cross":
            return (
                <div className="flex justify-center">
                    <X className="w-5 h-5 text-muted-foreground/30 stroke-[2]" />
                </div>
            );
        case "partial":
            return (
                <div className="flex justify-center">
                    <div className="bg-muted-foreground/10 p-1.5 rounded-full ring-4 ring-muted-foreground/5">
                        <Minus className="w-5 h-5 text-muted-foreground stroke-[3]" />
                    </div>
                </div>
            );
        default:
            return null;
    }
};

export default function Comparison() {
    return (
        <section className="py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden" id="comparison">
            {/* Background elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-primary/5 rounded-full blur-[140px] -z-10" />

            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-20 space-y-4">
                    <motion.span
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-primary font-bold tracking-[0.2em] uppercase text-sm block"
                    >
                        Why Deft?
                    </motion.span>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-5xl lg:text-6xl font-bold font-alan-sans tracking-tight max-w-4xl mx-auto leading-tight"
                    >
                        Other tools give you content. <br className="hidden md:block" />
                        Deft gives you a <span className="text-primary italic">content operation.</span>
                    </motion.h2>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="relative overflow-x-auto pb-8"
                >
                    <table className="w-full border-separate border-spacing-y-4">
                        <thead>
                            <tr className="text-left text-xs uppercase font-bold tracking-[0.2em] text-muted-foreground/50">
                                <th className="px-8 pb-4">Features</th>
                                <th className="px-8 pb-4 text-center">
                                    <div className="inline-block px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                                        Deft
                                    </div>
                                </th>
                                <th className="px-8 pb-4 text-center">Generic AI Tools</th>
                                <th className="px-8 pb-4 text-center">Content Suite Platforms</th>
                            </tr>
                        </thead>
                        <tbody className="font-lexend-deca">
                            {comparisonData.map((row, index) => (
                                <tr
                                    key={index}
                                    className="group transition-all"
                                >
                                    <td className="px-8 py-6 rounded-l-[1.5rem] border-l border-t border-b border-border/40 bg-muted/10 group-hover:bg-muted/20 text-lg font-medium transition-colors">
                                        {row.feature}
                                    </td>
                                    <td className="px-8 py-6 border-t border-b border-border/40 bg-primary/[0.03] group-hover:bg-primary/[0.05] transition-colors relative">
                                        {/* Highlight background for Deft column */}
                                        <div className="absolute inset-x-0 inset-y-0 border-x border-primary/10 -z-10" />
                                        <StatusIcon status={row.deft} />
                                    </td>
                                    <td className="px-8 py-6 border-t border-b border-border/40 bg-muted/10 group-hover:bg-muted/20 transition-colors">
                                        <StatusIcon status={row.generic} />
                                    </td>
                                    <td className="px-8 py-6 rounded-r-[1.5rem] border-r border-t border-b border-border/40 bg-muted/10 group-hover:bg-muted/20 transition-colors">
                                        <StatusIcon status={row.suite} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                    className="mt-16 text-center max-w-4xl mx-auto space-y-8"
                >
                    <div className="h-px w-32 bg-gradient-to-r from-transparent via-border to-transparent mx-auto" />

                    <p className="text-lg md:text-xl font-lexend-deca text-muted-foreground leading-relaxed">
                        <span className="text-foreground font-semibold">Copy.ai writes. Notion organizes. Jasper generates.</span> None of them learn your niche, automate your system, or tell you why your last post underperformed. Deft does all of it — in one place, built specifically for you.
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
