
import { z } from "zod";

export const appointmentSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).max(100, { message: "Name must be 100 characters or less."}),
  age: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number({ invalid_type_error: "Please enter a valid number for age."}).int().positive({ message: "Age must be a positive number." }).optional()
  ),
  contactNumber: z.string().min(10, {message: "Contact number must be at least 10 digits."}).optional().or(z.literal('')), // Optional, allows empty string
  address: z.string().max(200, { message: "Address must be 200 characters or less." }).optional().or(z.literal('')),
  BP: z.string().max(20, { message: "BP value must be 20 characters or less." }).optional().or(z.literal('')),
  preferredDate: z.date({
    required_error: "A date for the appointment is required.",
    invalid_type_error: "That's not a valid date!",
  }),
  preferredTime: z.string().min(1, { message: "Please select a preferred time." }),
  doctorId: z.string().min(1, { message: "Please select a doctor." }),
  isOnline: z.boolean().default(false),
  
  // Payment related fields - mostly optional from form, set by backend
  paymentId: z.string().optional(),
  orderId: z.string().optional(),
  signature: z.string().optional(),
  appointmentType: z.enum(["Online", "Clinic"]).optional(),
  paymentStatus: z.enum(["Paid", "Pending", "Failed", "PayAtClinic", "Refunded"]).optional(),
  paymentMethod: z.string().optional(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  paidAt: z.date().optional(),
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
