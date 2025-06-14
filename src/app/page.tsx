
"use client"; 
import { AppointmentForm } from "@/components/appointment-form";
import { AuthButton } from "@/components/auth-button";
import { useState, useEffect } from 'react';
import type { User } from "@/lib/types";

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('easyAppointmentUser');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        // Handle error or clear invalid item
        localStorage.removeItem('easyAppointmentUser');
      }
    }
    setIsLoading(false);
     // Listen for storage changes to update UI if user logs in/out in another tab
    const handleStorageChange = () => {
        const updatedStoredUser = localStorage.getItem('easyAppointmentUser');
        if (updatedStoredUser) {
            try { setUser(JSON.parse(updatedStoredUser)); } catch(e) { setUser(null); }
        } else {
            setUser(null);
        }
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('authChange', handleStorageChange); // For immediate updates

    return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('authChange', handleStorageChange);
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between max-w-screen-2xl px-4 md:px-8">
          <div className="flex items-center">
             <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary mr-2">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="currentColor"/>
                <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z" fill="currentColor"/>
             </svg>
            <h1 className="text-2xl font-headline font-bold text-primary tracking-tight">
              Easy Appointment
            </h1>
          </div>
          <AuthButton />
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8 md:py-12 flex flex-col items-center">
        <div className="w-full max-w-4xl text-center mb-10">
          {isLoading ? (
            <div className="h-10 bg-muted animate-pulse rounded w-3/4 mx-auto mb-3"></div>
          ) : user ? (
            <h2 className="text-3xl md:text-4xl font-headline font-semibold text-foreground mb-3">
              Welcome back, {user.name}!
            </h2>
          ) : (
            <h2 className="text-3xl md:text-4xl font-headline font-semibold text-foreground mb-3">
              Hassle-Free Scheduling is Here
            </h2>
          )}
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Quickly book your appointments with our expert doctors. Your health, simplified.
          </p>
        </div>
        
        <AppointmentForm />

      </main>

      <footer className="py-8 border-t bg-background">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} Easy Appointment. All rights reserved.</p>
          <p className="mt-1">Designed for a seamless healthcare experience.</p>
        </div>
      </footer>
    </div>
  );
}
