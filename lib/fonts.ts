import { Alan_Sans, Inter } from 'next/font/google';
import { Lexend_Deca } from 'next/font/google';

export const alanSans = Alan_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--alan-sans',
  fallback: ['Inter']
});

export const lexendDeca = Lexend_Deca({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--lexend-deca',
});

export const inter = Inter({
  subsets: ['latin'],
  variable: '--inter',
  fallback: ['Inter']
});