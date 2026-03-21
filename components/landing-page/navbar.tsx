'use client';

import { Suspense, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const AuthNavButtons = dynamic(() => import('@/components/auth-nav-buttons').then(mod => ({ default: mod.AuthNavButtons })), {
    loading: () => (
        <div className="flex gap-4">
            <Skeleton className="h-10 w-20 rounded-md" />
            <Skeleton className="h-10 w-24 rounded-md" />
        </div>
    ),
});

export default function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    const navLinks = [
        { name: 'Features', href: '#features' },
        { name: 'How it works', href: '#how-it-works' },
        { name: 'Pricing', href: '#pricing' },
    ];

    return (
        <nav className="sticky top-0 z-50 w-full py-4 px-4 sm:px-6 lg:px-8">
            <div className="mx-auto flex w-[90%] max-sm:w-full items-center justify-between">

                {/* Desktop Navbar */}
                <div className='hidden sm:flex bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 items-center gap-7 border rounded-xl p-2 px-4'>
                    <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
                        <Image
                            src="/deft-logo.png"
                            alt="Deft"
                            width={32}
                            height={32}
                            className="rounded-md"
                        />
                        <span className='font-lexend-deca'>Deft</span>
                    </Link>

                    <ul className='flex items-center gap-1 list-none font-alan-sans font-medium'>
                        {navLinks.map((link) => (
                            <li key={link.name} className='px-3 py-1.5 hover:bg-accent/40 rounded-lg transition-colors'>
                                <Link href={link.href}>{link.name}</Link>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Mobile Navbar */}
                <div className='sm:hidden flex w-full items-center justify-between'>
                    <div className='bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center gap-2 border rounded-xl p-2 px-4 shadow-sm'>
                        <Image
                            src="/deft-logo.png"
                            alt="Deft"
                            width={28}
                            height={28}
                            className="rounded-md"
                        />
                        <span className='font-lexend-deca font-semibold'>Deft</span>
                    </div>

                    <button
                        onClick={toggleMenu}
                        className='bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-3 border rounded-xl shadow-sm hover:bg-accent/40 transition-colors'
                        aria-label="Toggle menu"
                    >
                        <AnimatePresence mode="wait" initial={false}>
                            {isMenuOpen ? (
                                <motion.div
                                    key="close"
                                    initial={{ rotate: -90, opacity: 0 }}
                                    animate={{ rotate: 0, opacity: 1 }}
                                    exit={{ rotate: 90, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <X className="size-5" />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="menu"
                                    initial={{ rotate: 90, opacity: 0 }}
                                    animate={{ rotate: 0, opacity: 1 }}
                                    exit={{ rotate: -90, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <Menu className="size-5" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </button>
                </div>

                {/* Desktop Auth Buttons */}
                <div className='hidden sm:block'>
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

            {/* Mobile Menu Dropdown */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="sm:hidden mt-4 mx-auto w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-2xl p-4 shadow-xl flex flex-col gap-6"
                    >
                        <ul className='flex flex-col gap-3 list-none font-alan-sans font-medium text-lg'>
                            {navLinks.map((link) => (
                                <li key={link.name} className='px-2 py-3 rounded-lg'>
                                    <Link href={link.href} onClick={() => setIsMenuOpen(false)}>
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>

                        <div className='pt-2'>
                            <Suspense
                                fallback={
                                    <div className="flex flex-col gap-4">
                                        <Skeleton className="h-10 w-full rounded-md" />
                                        <Skeleton className="h-10 w-full rounded-md" />
                                    </div>
                                }
                            >
                                <div className='flex flex-col gap-4' onClick={() => setIsMenuOpen(false)}>
                                    <AuthNavButtons />
                                </div>
                            </Suspense>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
