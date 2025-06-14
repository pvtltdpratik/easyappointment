
import { z } from "zod";

export const appointmentSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).max(100, { message: "Name must be 100 characters or less."}),
  preferredDate: z.date({
    required_error: "A date for the appointment is required.",
    invalid_type_error: "That's not a valid date!",
  }),
  preferredTime: z.string().min(1, { message: "Please select a preferred time." }),
  doctorId: z.string().min(1, { message: "Please select a doctor." }),
  isOnline: z.boolean().default(false),
});

export const registrationSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).max(100),
  email: z.string().email({ message: "Invalid email address." }),
  contactNumber: z.string().min(10, {message: "Contact number must be at least 10 digits."}).optional().or(z.literal('')), // Optional, allows empty string
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters." }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"], // Error will be associated with the confirmPassword field
});

export const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});
