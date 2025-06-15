
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
// import { ScheduleAppointmentForm } from "@/components/schedule-appointment-form"; // Assuming this component exists
import { ScrollText, CalendarDays, CalendarPlus, LogOut } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// --- Mocking AuthContext and Firebase for structure generation ---
// In a real scenario, these would be imported from your actual files.
// Replace these mocks with your actual implementations.

// Mock for useAuth hook from @/context/AuthContext
interface MockUser {
  uid: string;
  email: string | null;
}
interface MockUserProfile {
  name: string;
  email: string;
  // Add other profile fields as needed
}
interface AuthContextType {
  currentUser: MockUser | null;
  userProfile: MockUserProfile | null;
  loadingAuth: boolean;
  loadingProfile: boolean;
  // signOut: () => Promise<void>; // Assuming signOut is part of context if firebase.signOutUser is not used directly
}

const useAuth = (): AuthContextType => {
  // This is a placeholder. Replace with your actual AuthContext logic.
  // For demonstration, cycle through states or set a default.
  const [currentUser, setCurrentUser] = useState<MockUser | null>(null);
  const [userProfile, setUserProfile] = useState<MockUserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    // Simulate auth loading
    setTimeout(() => {
      // Simulate a logged-in user
      const mockUser = { uid: '123', email: 'test@example.com' };
      setCurrentUser(mockUser);
      setLoadingAuth(false);
      
      // Simulate profile loading
      setTimeout(() => {
        // Simulate successful profile load
        setUserProfile({ name: 'Test User', email: 'test@example.com' });
        // OR Simulate profile load error:
        // setUserProfile(null); 
        setLoadingProfile(false);
      }, 1500);
    }, 1500);
  }, []);

  return { currentUser, userProfile, loadingAuth, loadingProfile };
};

// Mock for signOutUser from @/lib/firebase
const signOutUser = async (): Promise<void> => {
  // This is a placeholder. Replace with your actual Firebase sign-out logic.
  console.log("Mock signOutUser called");
  // Simulate success or failure
  // return Promise.resolve(); // Success
  // return Promise.reject(new Error("Mock logout failed")); // Failure
};

// Placeholder for ScheduleAppointmentForm
const ScheduleAppointmentForm = () => (
  <div className="p-6 border rounded-lg shadow-md bg-card">
    <h2 className="text-xl font-semibold mb-4 text-primary">Schedule Appointment Form Area</h2>
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-1/2" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-24" />
    </div>
  </div>
);
// --- End of Mocks ---


export default function ScheduleAppointmentPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { currentUser, userProfile, loadingAuth, loadingProfile } = useAuth();

  useEffect(() => {
    if (!loadingAuth && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, loadingAuth, router]);

  const handleLogout = async () => {
    try {
      await signOutUser();
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/login');
    } catch (error) {
      console.error("Logout failed:", error);
      toast({
        title: "Logout Failed",
        description: "Could not log you out. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loadingAuth || (currentUser && loadingProfile)) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        {/* Header Skeleton */}
        <header className="border-b bg-background/90 sticky top-0 z-40">
          <div className="container mx-auto px-4 md:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-left">
              <Skeleton className="h-10 w-48 mb-1" />
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-9 w-24 rounded-md" />
            </div>
          </div>
        </header>

        {/* Navigation Skeleton */}
        <nav className="container mx-auto px-4 md:px-8 mt-6 mb-2">
          <Skeleton className="h-10 w-full md:w-1/2 lg:w-2/3 xl:w-1/2 mx-auto rounded-md p-1" />
        </nav>

        {/* Main Content Skeleton */}
        <main className="container mx-auto p-4 md:p-8 flex-grow">
          <Skeleton className="h-8 w-72 mb-6" />
          <Skeleton className="h-96 w-full rounded-lg" />
        </main>

        {/* Footer Skeleton */}
        <footer className="py-6 text-center border-t mt-auto">
          <Skeleton className="h-4 w-56 mx-auto" />
        </footer>
      </div>
    );
  }

  if (!currentUser) {
    // This state should ideally be very brief as the useEffect redirects.
    return (
        <div className="flex flex-col min-h-screen items-center justify-center bg-background p-4">
            <p className="text-lg text-foreground">Redirecting to login...</p>
            <Skeleton className="h-8 w-32 mt-4" />
        </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <header className="border-b bg-background/90 sticky top-0 z-40">
           <div className="container mx-auto px-4 md:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-left">
              <h1 className="text-3xl md:text-4xl font-headline font-bold text-primary">RxMind</h1>
              <p className="text-sm md:text-base text-muted-foreground mt-1">Psychiatry Prescription & Appointment Manager</p>
            </div>
             <Button variant="outline" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
          </div>
        </header>
        <main className="container mx-auto p-4 md:p-8 flex-grow flex flex-col items-center justify-center text-center">
          <h2 className="text-2xl font-semibold text-destructive mb-3">User Profile Error</h2>
          <p className="text-muted-foreground mb-6">
            We encountered an issue loading your profile details. Please log out and try again.
          </p>
        </main>
        <footer className="py-6 text-center text-muted-foreground text-sm border-t mt-auto">
          <p>© {new Date().getFullYear()} RxMind. All rights reserved.</p>
        </footer>
      </div>
    );
  }

  const navLinks = [
    { href: "/", label: "Prescriptions", icon: ScrollText },
    { href: "/appointments", label: "All Appointments", icon: CalendarDays },
    { href: "/schedule-appointment", label: "Schedule Appointment", icon: CalendarPlus },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="border-b bg-background/90 sticky top-0 z-40">
        <div className="container mx-auto px-4 md:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl md:text-4xl font-headline font-bold text-primary">RxMind</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">Psychiatry Prescription & Appointment Manager</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm text-foreground">Welcome, {userProfile.name}</p>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <nav className="container mx-auto px-4 md:px-8 mt-6 mb-2">
        <div className="flex justify-center bg-muted p-1 rounded-md md:w-1/2 lg:w-2/3 xl:w-1/2 mx-auto">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex-1 py-2 px-3 text-sm font-medium rounded-md flex items-center justify-center transition-colors",
                  isActive ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
                )}
              >
                <Icon className="mr-2 h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="container mx-auto p-4 md:p-8 flex-grow">
        {/* Title for the form section - can be part of the form component too */}
        {/* <h2 className="text-2xl font-semibold text-foreground mb-6">Schedule New Appointment</h2> */}
        <ScheduleAppointmentForm />
      </main>

      <footer className="py-6 text-center text-muted-foreground text-sm border-t mt-auto">
        <p>© {new Date().getFullYear()} RxMind. All rights reserved.</p>
      </footer>
    </div>
  );
}
