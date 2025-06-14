
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, UserCircle, UserPlus, LogInIcon } from 'lucide-react';
import type { User } from "@/lib/types";

export function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('easyAppointmentUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // Basic validation of stored user structure
        if (parsedUser && parsedUser.email && parsedUser.name) {
          setUser(parsedUser);
        } else {
          localStorage.removeItem('easyAppointmentUser'); // Clear invalid data
        }
      } catch (error) {
        console.error("Error parsing user from localStorage", error);
        localStorage.removeItem('easyAppointmentUser'); // Clear corrupted data
      }
    }
    setIsLoading(false);

    const handleStorageChange = () => {
        const updatedStoredUser = localStorage.getItem('easyAppointmentUser');
        if (updatedStoredUser) {
            try {
                setUser(JSON.parse(updatedStoredUser));
            } catch (e) { setUser(null); }
        } else {
            setUser(null);
        }
    };

    window.addEventListener('storage', handleStorageChange);
    // Also listen for a custom event that can be dispatched after login/logout
    // to ensure immediate UI update if router.refresh() is not sufficient.
    window.addEventListener('authChange', handleStorageChange);


    return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('authChange', handleStorageChange);
    };

  }, []);

  const handleSignOut = () => {
    setUser(null);
    localStorage.removeItem('easyAppointmentUser');
    // Dispatch custom event to ensure immediate UI update across components
    window.dispatchEvent(new CustomEvent('authChange'));
    router.push('/'); // Redirect to home or login page
    router.refresh(); // Force a refresh to re-evaluate server components if any depend on auth state
  };

  if (isLoading) {
    return <Button variant="outline" size="sm" disabled className="animate-pulse">Loading...</Button>;
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarImage src={user.imageUrl || `https://placehold.co/40x40.png?text=${user.name.charAt(0)}`} alt={user.name} data-ai-hint="profile avatar" />
          <AvatarFallback>
            {user.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase() || <UserCircle size={20} />}
          </AvatarFallback>
        </Avatar>
        <div className="text-sm hidden md:block">
          <p className="font-medium">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          <LogOut className="mr-0 md:mr-2 h-4 w-4" />
          <span className="hidden md:inline">Sign Out</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/login">
          <LogInIcon className="mr-2 h-4 w-4" />
          Login
        </Link>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link href="/register">
          <UserPlus className="mr-2 h-4 w-4" />
          Register
        </Link>
      </Button>
    </div>
  );
}
