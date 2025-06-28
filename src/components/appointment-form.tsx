
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Clock, User, Briefcase, Wifi, Phone, AlertCircle, CreditCard, MapPin, HeartPulse } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { Doctor, User as UserType } from "@/lib/types";
import { appointmentSchema } from "@/lib/schemas";
import { createAppointmentAction, getDoctorsAction, createRazorpayOrderAction, type AppointmentFormState, type GetDoctorsState, type RazorpayOrderState } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import React, { useState, useTransition, useEffect } from "react";

const timeSlots = Array.from({ length: 17 }, (_, i) => {
  const hour = 9 + Math.floor(i / 2);
  const minute = i % 2 === 0 ? "00" : "30";
  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${String(displayHour).padStart(2, '0')}:${minute} ${period}`;
});

const CONSULTATION_FEE_PAISE = 50000; // 500.00 INR

// Helper function to load Razorpay script
const loadRazorpayScript = (src: string): Promise<boolean> => {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error("Razorpay SDK failed to load.");
      resolve(false);
    };
    document.body.appendChild(script);
  });
};


export function AppointmentForm() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [doctorsList, setDoctorsList] = useState<Doctor[]>([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);
  const [doctorsError, setDoctorsError] = useState<string | null>(null);
  const [loggedInUser, setLoggedInUser] = useState<UserType | null>(null);

  const form = useForm<z.infer<typeof appointmentSchema>>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      name: "",
      age: undefined,
      contactNumber: "",
      address: "",
      BP: "",
      preferredDate: undefined,
      preferredTime: "",
      doctorId: "",
      isOnline: false,
    },
  });

  useEffect(() => {
    const fetchDoctors = async () => {
      setIsLoadingDoctors(true);
      setDoctorsError(null);
      const result: GetDoctorsState = await getDoctorsAction();
      if (result.success && result.doctors) {
        setDoctorsList(result.doctors);
      } else {
        setDoctorsError(result.error || "Failed to load doctors.");
        toast({
          title: "Error Loading Doctors",
          description: result.error || "Could not fetch the list of doctors. Please try again later.",
          variant: "destructive",
        });
      }
      setIsLoadingDoctors(false);
    };
    fetchDoctors();

    const storedUser = localStorage.getItem('easyAppointmentUser');
    if (storedUser) {
      try {
        const user: UserType = JSON.parse(storedUser);
        setLoggedInUser(user);
        form.reset({
          ...form.getValues(),
          name: user.name || "",
          age: user.age || undefined,
          contactNumber: user.contactNumber || "",
          address: user.address || "",
        });
      } catch (e) {
        console.error("Failed to parse user for pre-filling appointment form:", e);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetFormToDefaults = () => {
    form.reset({
        name: loggedInUser?.name || "",
        age: loggedInUser?.age || undefined,
        contactNumber: loggedInUser?.contactNumber || "",
        address: loggedInUser?.address || "",
        BP: "",
        preferredDate: undefined,
        preferredTime: "",
        doctorId: "",
        isOnline: false,
        paymentId: undefined,
        orderId: undefined,
        signature: undefined,
    });
  };

  const handleScheduleAppointment = async (values: z.infer<typeof appointmentSchema>, paymentDetails?: { paymentId: string; orderId: string; signature: string }) => {
    setFormError(null);
    const finalValues = paymentDetails ? { ...values, ...paymentDetails } : values;

    startTransition(async () => {
      const result: AppointmentFormState = await createAppointmentAction(finalValues);
      if (result.success) {
        toast({
          title: "Success!",
          description: result.message || (paymentDetails ? "Your payment was successful and appointment is scheduled." : "Your appointment has been scheduled."),
        });
        resetFormToDefaults();
      } else {
        const generalErrorMessage = result.errors?._form?.join(', ') || result.message || (paymentDetails ? "Payment was successful but failed to schedule appointment. Please contact support." : "Failed to schedule appointment. Please try again.");
        setFormError(generalErrorMessage);
        toast({
          title: "Error",
          description: generalErrorMessage,
          variant: "destructive",
        });
      }
      setIsPaymentProcessing(false);
    });
  };


  const handleOnlinePaymentAndScheduling = async (values: z.infer<typeof appointmentSchema>) => {
    setIsPaymentProcessing(true);
    setFormError(null);

    const orderResult: RazorpayOrderState = await createRazorpayOrderAction({ amount: CONSULTATION_FEE_PAISE });

    if (!orderResult.success || !orderResult.order) {
      toast({
        title: "Payment Error",
        description: orderResult.error || "Could not initiate payment. Please try again.",
        variant: "destructive",
      });
      setIsPaymentProcessing(false);
      return;
    }

    const razorpayLoaded = await loadRazorpayScript("https://checkout.razorpay.com/v1/checkout.js");
    if (!razorpayLoaded || typeof window.Razorpay === "undefined") {
        toast({ title: "Payment Error", description: "Could not load payment gateway. Please refresh and try again.", variant: "destructive"});
        setIsPaymentProcessing(false);
        return;
    }
    
    const { order } = orderResult;

    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      name: "Easy Appointment",
      description: "Online Consultation Fee",
      order_id: order.id,
      handler: async (response: any) => {
        await handleScheduleAppointment(values, {
          paymentId: response.razorpay_payment_id,
          orderId: response.razorpay_order_id,
          signature: response.razorpay_signature,
        });
      },
      prefill: {
        name: values.name,
        email: loggedInUser?.email || "", 
        contact: values.contactNumber || loggedInUser?.contactNumber || "",
      },
      theme: {
        color: "#73A5D6", // Using primary color from your theme
      },
      modal: {
        ondismiss: function() {
            toast({ title: "Payment Cancelled", description: "Your payment process was cancelled.", variant: "default"});
            setIsPaymentProcessing(false);
        }
      }
    };

    try {
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response: any) {
            console.error("Razorpay payment failed:", response.error);
            toast({
                title: "Payment Failed",
                description: `${response.error.description || 'An error occurred during payment.'} (Reason: ${response.error.reason || 'Unknown'})`,
                variant: "destructive",
            });
            setIsPaymentProcessing(false);
        });
        rzp.open();
    } catch (error) {
        console.error("Error opening Razorpay checkout:", error);
        toast({ title: "Payment Error", description: "Could not initialize payment gateway. Please try again.", variant: "destructive"});
        setIsPaymentProcessing(false);
    }
  };


  function onSubmit(values: z.infer<typeof appointmentSchema>) {
    if (values.isOnline) {
      handleOnlinePaymentAndScheduling(values);
    } else {
      handleScheduleAppointment(values);
    }
  }

  const isOnlineConsultation = form.watch("isOnline");

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
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><User className="mr-2 h-4 w-4 text-accent" />Age (Optional)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g. 35" {...field} value={field.value ?? ''} aria-label="Age" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><Phone className="mr-2 h-4 w-4 text-accent" />Contact Number</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="e.g. 1234567890 (Required for Patient Record)" {...field} aria-label="Contact Number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                <FormItem>
                    <FormLabel className="flex items-center"><MapPin className="mr-2 h-4 w-4 text-accent" />Address (Optional)</FormLabel>
                    <FormControl>
                    <Textarea placeholder="e.g. 123 Main St, Anytown, USA" {...field} aria-label="Address" />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="BP"
                render={({ field }) => (
                <FormItem>
                    <FormLabel className="flex items-center"><HeartPulse className="mr-2 h-4 w-4 text-accent" />Blood Pressure (BP) (Optional)</FormLabel>
                    <FormControl>
                    <Input placeholder="e.g. 120/80" {...field} aria-label="Blood Pressure (BP)" />
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
                            date < new Date(new Date().setHours(0,0,0,0))
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
                  <Select onValueChange={field.onChange} defaultValue={field.value} aria-label="Select Doctor" disabled={isLoadingDoctors || doctorsList.length === 0}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingDoctors ? "Loading doctors..." : (doctorsList.length === 0 && !doctorsError) ? "No doctors available" : "Choose your preferred doctor"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingDoctors ? (
                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                      ) : doctorsList.length > 0 ? (
                        doctorsList.map((doctor) => (
                          <SelectItem key={doctor.id} value={doctor.id}>
                            {doctor.name}
                            {doctor.specialty && <span className="text-sm text-muted-foreground"> - {doctor.specialty}</span>}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-doctors" disabled>
                          {doctorsError ? "Error loading doctors" : "No doctors available"}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {doctorsError && !isLoadingDoctors && (
                     <Alert variant="destructive" className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                           {doctorsError}
                        </AlertDescription>
                    </Alert>
                  )}
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
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                      }}
                      aria-label="Request online consultation"
                      id="isOnline"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel htmlFor="isOnline" className="flex items-center cursor-pointer">
                     <Wifi className="mr-2 h-4 w-4 text-accent" /> Request Online Consultation
                    </FormLabel>
                    <FormDescription>
                      Check this box if you prefer an online video consultation (payment required). Fee: ₹{(CONSULTATION_FEE_PAISE / 100).toFixed(2)}
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {formError && (
                <p className="text-sm font-medium text-destructive">{formError}</p>
            )}

            <Button 
              type="submit" 
              className="w-full md:w-auto" 
              disabled={isPending || isLoadingDoctors || isPaymentProcessing}
            >
              {isOnlineConsultation ? <CreditCard className="mr-2 h-4 w-4" /> : null}
              {isPending ? "Scheduling..." : 
                isPaymentProcessing ? "Processing Payment..." : 
                isOnlineConsultation ? "Pay & Schedule Appointment" : "Schedule Appointment"
              }
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
