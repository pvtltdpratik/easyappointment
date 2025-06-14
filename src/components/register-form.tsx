
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Lock, Mail, Building } from "lucide-react"; // Using Building for name as a generic icon

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { registrationSchema } from "@/lib/schemas";
import { registerUserAction, type AuthFormState } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import React, { useState, useTransition } from "react";
import type { User as UserType } from "@/lib/types";

export function RegisterForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof registrationSchema>>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  function onSubmit(values: z.infer<typeof registrationSchema>) {
    setFormError(null);
    startTransition(async () => {
      const result: AuthFormState = await registerUserAction(values);
      if (result.success && result.user) {
        toast({
          title: "Registration Successful!",
          description: result.message || "You can now log in.",
        });
        // Optionally auto-login by setting user in localStorage and redirecting
        // For now, just redirect to login page
        router.push("/login");
      } else {
        if (result.errors) {
          Object.entries(result.errors).forEach(([field, messages]) => {
            if (messages && messages.length > 0) {
              if (field === "_form") {
                 setFormError(messages.join(', '));
              } else {
                form.setError(field as keyof z.infer<typeof registrationSchema>, {
                  type: "server",
                  message: messages.join(", "),
                });
              }
            }
          });
        }
        const generalErrorMessage = result.errors?._form?.join(", ") || result.message || "Registration failed. Please try again.";
        setFormError(generalErrorMessage);
        toast({
          title: "Registration Error",
          description: generalErrorMessage,
          variant: "destructive",
        });
      }
    });
  }

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl text-primary">Create an Account</CardTitle>
        <CardDescription>Join Easy Appointment to manage your health.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><User className="mr-2 h-4 w-4 text-accent" />Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. John Doe" {...field} aria-label="Full Name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><Mail className="mr-2 h-4 w-4 text-accent" />Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="e.g. john.doe@example.com" {...field} aria-label="Email Address" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><Lock className="mr-2 h-4 w-4 text-accent" />Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} aria-label="Password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><Lock className="mr-2 h-4 w-4 text-accent" />Confirm Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} aria-label="Confirm Password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {formError && (
                <p className="text-sm font-medium text-destructive">{formError}</p>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Registering..." : "Register"}
            </Button>
          </form>
        </Form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
