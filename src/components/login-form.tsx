
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock } from "lucide-react";

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
import { loginSchema } from "@/lib/schemas";
import { loginUserAction, type AuthFormState } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import React, { useState, useTransition } from "react";
import type { User as UserType } from "@/lib/types";

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(values: z.infer<typeof loginSchema>) {
    setFormError(null);
    startTransition(async () => {
      const result: AuthFormState = await loginUserAction(values);
      if (result.success && result.user) {
        // Store user in localStorage to simulate session
        localStorage.setItem('easyAppointmentUser', JSON.stringify(result.user));
        toast({
          title: "Login Successful!",
          description: result.message || "Welcome back!",
        });
        router.push("/"); // Redirect to homepage
        router.refresh(); // Refresh to update AuthButton state
      } else {
         if (result.errors) {
          Object.entries(result.errors).forEach(([field, messages]) => {
            if (messages && messages.length > 0) {
              if (field === "_form") {
                 setFormError(messages.join(', '));
              } else {
                 form.setError(field as keyof z.infer<typeof loginSchema>, {
                    type: "server",
                    message: messages.join(", "),
                });
              }
            }
          });
        }
        const generalErrorMessage = result.errors?._form?.join(", ") || result.message || "Login failed. Please try again.";
        setFormError(generalErrorMessage);
        toast({
          title: "Login Error",
          description: generalErrorMessage,
          variant: "destructive",
        });
      }
    });
  }

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl text-primary">Welcome Back</CardTitle>
        <CardDescription>Log in to your Easy Appointment account.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

            {formError && (
                <p className="text-sm font-medium text-destructive">{formError}</p>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Logging in..." : "Log In"}
            </Button>
          </form>
        </Form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Register
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
