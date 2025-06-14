
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Inter, PT_Sans } from 'next/font/google'; // Import Inter and PT_Sans

// Configure PT Sans font
const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-pt-sans', // CSS variable for PT Sans
  display: 'swap',
});

// Configure Inter font as a fallback or general UI font if needed
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter', // CSS variable for Inter
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Easy Appointment',
  description: 'Schedule your appointments with ease.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${ptSans.variable} ${inter.variable}`}>
      <head>
        {/* Google Fonts link for PT Sans is managed by next/font, so direct link can be removed if not used elsewhere */}
      </head>
      <body className="font-body antialiased min-h-screen flex flex-col bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
