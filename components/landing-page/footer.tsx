"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

const footerLinks = {
    product: [
        { name: "Features", href: "#features" },
        { name: "How It Works", href: "#how-it-works" },
        { name: "Pricing", href: "#pricing" },
        { name: "Changelog", href: "#changelog" },
        { name: "Roadmap", href: "#roadmap" },
    ],
    company: [
        { name: "About", href: "#about" },
        { name: "Blog", href: "#blog" },
        { name: "Careers", href: "#careers" },
        { name: "Press", href: "#press" },
    ],
    support: [
        { name: "Help Center", href: "#help" },
        { name: "Contact", href: "#contact" },
        { name: "Privacy Policy", href: "/privacy" },
        { name: "Terms of Service", href: "/terms" },
    ],
    social: [
        { name: "TikTok", href: "https://tiktok.com" },
        { name: "YouTube", href: "https://youtube.com" },
        { name: "X", href: "https://x.com" },
        { name: "LinkedIn", href: "https://linkedin.com" },
    ],
};

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="relative border-t border-border/40 bg-background/50 backdrop-blur-sm pt-24 pb-12 overflow-hidden">
            {/* Background Accent */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-primary/5 blur-[120px] -z-10" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-12 lg:gap-8 mb-20">
                    {/* Brand Column */}
                    <div className="col-span-2 md:col-span-4 lg:col-span-4 space-y-6">
                        <Link href="/" className="flex items-center gap-2 group transition-opacity">
                            <Image
                                src="/deft-logo.png"
                                alt="Deft"
                                width={32}
                                height={32}
                                className="rounded-xl shadow-lg shadow-primary/10 transition-transform group-hover:scale-110"
                            />
                            <span className="text-xl font-bold font-lexend-deca tracking-tight">Deft</span>
                        </Link>
                        <p className="text-lg font-lexend-deca text-muted-foreground/80 max-w-xs leading-relaxed">
                            Deft — The AI operator for modern creators.
                        </p>
                    </div>

                    {/* Links Columns */}
                    <div className="col-span-1 md:col-span-1 lg:col-span-2 space-y-6">
                        <h4 className="text-sm font-bold font-alan-sans uppercase tracking-widest text-primary/80">Product</h4>
                        <ul className="space-y-4">
                            {footerLinks.product.map((link) => (
                                <li key={link.name}>
                                    <Link href={link.href} className="text-muted-foreground hover:text-primary transition-colors font-lexend-deca text-[15px]">
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="col-span-1 md:col-span-1 lg:col-span-2 space-y-6">
                        <h4 className="text-sm font-bold font-alan-sans uppercase tracking-widest text-primary/80">Company</h4>
                        <ul className="space-y-4">
                            {footerLinks.company.map((link) => (
                                <li key={link.name}>
                                    <Link href={link.href} className="text-muted-foreground hover:text-primary transition-colors font-lexend-deca text-[15px]">
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="col-span-1 md:col-span-1 lg:col-span-2 space-y-6">
                        <h4 className="text-sm font-bold font-alan-sans uppercase tracking-widest text-primary/80">Support</h4>
                        <ul className="space-y-4">
                            {footerLinks.support.map((link) => (
                                <li key={link.name}>
                                    <Link href={link.href} className="text-muted-foreground hover:text-primary transition-colors font-lexend-deca text-[15px]">
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="col-span-1 md:col-span-1 lg:col-span-2 space-y-6">
                        <h4 className="text-sm font-bold font-alan-sans uppercase tracking-widest text-primary/80">Social</h4>
                        <ul className="space-y-4">
                            {footerLinks.social.map((link) => (
                                <li key={link.name}>
                                    <Link href={link.href} className="text-muted-foreground hover:text-primary transition-colors font-lexend-deca text-[15px]">
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-border/20 flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-sm font-lexend-deca text-muted-foreground/60">
                        © {currentYear} Deft. All rights reserved. Built for the modern creator economy.
                    </p>
                    <div className="flex items-center gap-8">
                        <Link href="/privacy" className="text-xs font-lexend-deca text-muted-foreground/40 hover:text-primary transition-colors">
                            Privacy
                        </Link>
                        <Link href="/terms" className="text-xs font-lexend-deca text-muted-foreground/40 hover:text-primary transition-colors">
                            Terms
                        </Link>
                        <Link href="/cookies" className="text-xs font-lexend-deca text-muted-foreground/40 hover:text-primary transition-colors">
                            Cookies
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
