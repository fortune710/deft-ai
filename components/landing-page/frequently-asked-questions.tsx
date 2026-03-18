"use client";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { motion, Variants } from "framer-motion";

const faqs = [
    {
        question: "Do I need to be a full-time creator to use Deft?",
        answer:
            "Not at all — Deft is built specifically for part-time creators. If you have a job, business, or degree and still want to grow an audience, Deft is designed around your constraints.",
    },
    {
        question: "Will the content sound like me or like a robot?",
        answer:
            "Neither — it'll sound like you. Deft's Niche DNA onboarding captures your tone, style, and audience so every script and caption is calibrated to your voice, not a generic template.",
    },
    {
        question: "What platforms does Deft support?",
        answer:
            "Deft currently supports TikTok, YouTube, LinkedIn, and X (Twitter), with more platforms rolling out soon.",
    },
    {
        question: "How is Deft different from ChatGPT or other AI tools?",
        answer:
            "ChatGPT is a blank canvas — powerful, but you have to figure out everything yourself. Deft is a purpose-built system: it knows your niche, maintains your content strategy, tracks your performance, and improves over time. It's not a tool. It's an operator.",
    },
    {
        question: "Can I cancel anytime?",
        answer:
            "Yes. No contracts, no annual commitments. Cancel with one click — though most creators who hit their groove don't want to.",
    },
];

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.5,
            ease: "easeOut",
        },
    },
};

export default function FrequentlyAskedQuestions() {
    return (
        <section className="relative py-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] -z-10" />
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[80px] -z-10" />

            <div className="max-w-4xl mx-auto relative">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16 space-y-4"
                >
                    <h2 className="text-4xl md:text-5xl font-bold font-alan-sans tracking-tight">
                        Got questions? <br className="sm:hidden" />
                        <span className="text-muted-foreground">We&apos;ve got answers.</span>
                    </h2>
                    <p className="text-lg font-lexend-deca text-muted-foreground/80 max-w-2xl mx-auto">
                        Everything you need to know about how Deft helps you build your content empire.
                    </p>
                </motion.div>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                >
                    <Accordion type="single" collapsible className="w-full space-y-4">
                        {faqs.map((faq, index) => (
                            <motion.div key={index} variants={itemVariants}>
                                <AccordionItem
                                    value={`item-${index}`}
                                    className="group border border-border/40 bg-muted/20 backdrop-blur-sm rounded-2xl px-2 transition-all hover:bg-muted/30 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 overflow-hidden"
                                >
                                    <AccordionTrigger className="text-left text-lg font-semibold font-alan-sans px-4 py-6 hover:no-underline transition-all [&[data-state=open]]:text-primary">
                                        {faq.question}
                                    </AccordionTrigger>
                                    <AccordionContent className="font-lexend-deca text-base text-muted-foreground/90 px-4 pb-6 leading-relaxed">
                                        {faq.answer}
                                    </AccordionContent>
                                </AccordionItem>
                            </motion.div>
                        ))}
                    </Accordion>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.8, duration: 1 }}
                    className="mt-16 text-center"
                >
                    <p className="text-sm font-lexend-deca text-muted-foreground/60 italic">
                        Still have questions? Reach out to us at support@deft.ai
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
