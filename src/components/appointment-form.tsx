
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Clock, User, Briefcase, Wifi } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Doctor } from "@/lib/types";
import { appointmentSchema } from "@/lib/schemas";
import { createAppointmentAction, type AppointmentFormState } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import React, { useState, useTransition } from "react";

const doctors: Doctor[] = [
  { id: "doc1", name: "Dr. Olivia Bennett", specialty: "Cardiology" },
  { id: "doc2", name: "Dr. Ethan Hayes", specialty: "Pediatrics" },
  { id: "doc3", name: "Dr. Sophia Castillo", specialty: "Dermatology" },
  { id: "doc4", name: "Dr. Liam Patel", specialty: "Neurology" },
];

const timeSlots = Array.from({ length: 17 }, (_, i) => {
  const hour = 9 + Math.floor(i / 2);
  const minute = i % 2 === 0 ? "00" : "30";
  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${String(displayHour).padStart(2, '0')}:${minute} ${period}`;
}); // Generates time slots from 09:00 AM to 05:00 PM in 30-min intervals


export function AppointmentForm() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof appointmentSchema>>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      name: "",
      preferredDate: undefined,
      preferredTime: "",
      doctorId: "",
      isOnline: false,
    },
  });

  function onSubmit(values: z.infer<typeof appointmentSchema>) {
    setFormError(null);
    startTransition(async () => {
      const result: AppointmentFormState = await createAppointmentAction(values);
      if (result.success) {
        toast({
          title: "Success!",
          description: result.message || "Your appointment has been scheduled.",
        });
        form.reset();
      } else {
        // Display field errors if any
        if (result.errors) {
            Object.entries(result.errors).forEach(([field, messages]) => {
                if (messages && messages.length > 0) {
                    if (field === '_form') {
                        setFormError(messages.join(', '));
                    } else {
                        form.setError(field as keyof z.infer<typeof appointmentSchema>, {
                            type: "server",
                            message: messages.join(', '),
                        });
                    }
                }
            });
        }
        // Display general form error or overall message
        const generalErrorMessage = result.errors?._form?.join(', ') || result.message || "Failed to schedule appointment. Please try again.";
        setFormError(generalErrorMessage);
        toast({
          title: "Error",
          description: generalErrorMessage,
          variant: "destructive",
        });
      }
    });
  }

  return (
    <Card className="w-full max-w-2xl shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl text-primary">Book Your Appointment</CardTitle>
        <CardDescription>Fill in the details below to schedule your visit.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormField
                control={form.control}
                name="preferredDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="flex items-center"><CalendarIcon className="mr-2 h-4 w-4 text-accent" />Preferred Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0,0,0,0)) // Disable past dates
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferredTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><Clock className="mr-2 h-4 w-4 text-accent" />Preferred Time</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} aria-label="Preferred Time">
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a time slot" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timeSlots.map((slot) => (
                          <SelectItem key={slot} value={slot}>
                            {slot}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="doctorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><Briefcase className="mr-2 h-4 w-4 text-accent" />Select Doctor</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} aria-label="Select Doctor">
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose your preferred doctor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {doctors.map((doctor) => (
                        <SelectItem key={doctor.id} value={doctor.id}>
                          {doctor.name} - <span className="text-sm text-muted-foreground">{doctor.specialty}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isOnline"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label="Request online consultation"
                      id="isOnline"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel htmlFor="isOnline" className="flex items-center cursor-pointer">
                     <Wifi className="mr-2 h-4 w-4 text-accent" /> Request Online Consultation
                    </FormLabel>
                    <FormDescription>
                      Check this box if you prefer an online video consultation.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            
            {formError && (
                <p className="text-sm font-medium text-destructive">{formError}</p>
            )}

            <Button type="submit" className="w-full md:w-auto" disabled={isPending}>
              {isPending ? "Scheduling..." : "Schedule Appointment"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
