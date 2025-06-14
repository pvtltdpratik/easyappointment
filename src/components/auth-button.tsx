"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogIn, LogOut, UserCircle } from 'lucide-react';

interface User {
  name: string;
  email: string;
  imageUrl?: string;
}

export function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate checking auth status on mount
    const storedUser = localStorage.getItem('easyAppointmentUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const handleSignIn = () => {
    const mockUser: User = {
      name: "Demo User",
      email: "demo@example.com",
      // Placeholder for Google profile picture
      imageUrl: `https://placehold.co/40x40.png?text=${"DU".charAt(0)}${"DU".charAt(1) || ""}`,
    };
    setUser(mockUser);
    localStorage.setItem('easyAppointmentUser', JSON.stringify(mockUser));
  };

  const handleSignOut = () => {
    setUser(null);
    localStorage.removeItem('easyAppointmentUser');
  };

  if (isLoading) {
    return <Button variant="outline" size="sm" disabled>Loading...</Button>;
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarImage src={user.imageUrl} alt={user.name} data-ai-hint="profile avatar" />
          <AvatarFallback>
            {user.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase() || <UserCircle size={20} />}
          </AvatarFallback>
        </Avatar>
        <div className="text-sm">
          <p className="font-medium">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={handleSignIn}>
      <LogIn className="mr-2 h-4 w-4" />
      Sign in with Google
    </Button>
  );
}
