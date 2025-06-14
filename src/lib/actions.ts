
"use server";

import type { z } from "zod";
import type { AppointmentRequest, User } from "./types";
import { appointmentSchema, loginSchema, registrationSchema } from "./schemas";

export type AppointmentFormState = {
  message?: string | null;
  errors?: {
    name?: string[];
    preferredDate?: string[];
    preferredTime?: string[];
    doctorId?: string[];
    isOnline?: string[];
    _form?: string[]; 
  };
  appointment?: AppointmentRequest | null;
  success?: boolean;
}

// IMPORTANT: This is a mock in-memory database for testing purposes only.
// Data will be lost on server restart. DO NOT USE IN PRODUCTION.
// Storing plain text passwords is a major security risk.
let mockPatientsDB: User[] = [];

export type AuthFormState = {
  message?: string | null;
  errors?: {
    name?: string[];
    email?: string[];
    contactNumber?: string[];
    password?: string[];
    confirmPassword?: string[];
    _form?: string[];
  };
  user?: User | null;
  success?: boolean;
};

export async function registerUserAction(
  data: z.infer<typeof registrationSchema>
): Promise<AuthFormState> {
  const validatedFields = registrationSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Invalid data provided. Failed to register.",
      success: false,
    };
  }

  const { name, email, contactNumber, password } = validatedFields.data;

  // Simulate checking if user already exists
  if (mockPatientsDB.some(user => user.email === email)) {
    return {
      errors: { email: ["User with this email already exists."] },
      message: "Registration failed.",
      success: false,
    };
  }

  const newUser: User = {
    id: Date.now().toString(), // simple unique ID
    name,
    email,
    contactNumber: contactNumber || undefined, // Store if provided
    password, // Storing password for testing - NOT SECURE
  };

  mockPatientsDB.push(newUser);
  console.log("Mock DB after registration:", mockPatientsDB);

  // Don't return the password to the client, even if it's for a mock session
  const { password: _, ...userWithoutPassword } = newUser;

  return {
    message: "Registration successful! You can now log in.",
    user: userWithoutPassword,
    success: true,
  };
}

export async function loginUserAction(
  data: z.infer<typeof loginSchema>
): Promise<AuthFormState> {
  const validatedFields = loginSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Invalid data provided. Failed to log in.",
      success: false,
    };
  }

  const { email, password } = validatedFields.data;

  const user = mockPatientsDB.find(u => u.email === email);

  if (!user) {
    return {
      errors: { _form: ["Invalid email or password."] },
      message: "Login failed.",
      success: false,
    };
  }

  // Simulate password check (NOT SECURE)
  if (user.password !== password) {
    return {
      errors: { _form: ["Invalid email or password."] },
      message: "Login failed.",
      success: false,
    };
  }
  
  console.log("Mock DB user found for login:", user);

  // Don't return the password to the client
  const { password: _, ...userWithoutPassword } = user;

  return {
    message: "Login successful!",
    user: userWithoutPassword,
    success: true,
  };
}


export async function createAppointmentAction(
  data: z.infer<typeof appointmentSchema>
): Promise<AppointmentFormState> {
  const validatedFields = appointmentSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Invalid data provided. Failed to create appointment.",
      success: false,
    };
  }

  const appointmentData = validatedFields.data;
  
  const newAppointment: AppointmentRequest = {
    ...appointmentData,
    createdAt: new Date(),
  };

  try {
    console.log("Simulating saving appointment:", newAppointment);
    await new Promise(resolve => setTimeout(resolve, 1000)); 

    return { 
      message: "Appointment created successfully!", 
      appointment: newAppointment,
      success: true,
    };
  } catch (error) {
    console.error("Failed to create appointment:", error);
    let errorMessage = "Database Error: Failed to create appointment.";
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return { 
        message: errorMessage,
        errors: { _form: ["An unexpected error occurred while saving the appointment."] },
        success: false,
    };
  }
}
