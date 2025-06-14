
"use server";

import type { z } from "zod";
import type { AppointmentRequest } from "./types";
import { appointmentSchema } from "./schemas";

export type AppointmentFormState = {
  message?: string | null;
  errors?: {
    name?: string[];
    preferredDate?: string[];
    preferredTime?: string[];
    doctorId?: string[];
    isOnline?: string[];
    _form?: string[]; // For general form errors
  };
  appointment?: AppointmentRequest | null;
  success?: boolean;
}

export async function createAppointmentAction(
  data: z.infer<typeof appointmentSchema>
): Promise<AppointmentFormState> {
  // Re-validate on the server
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
    // In a real app, userEmail would be derived from the authenticated session
    // userEmail: session?.user?.email 
  };

  try {
    // Simulate saving to Firestore
    console.log("Simulating saving appointment to Firestore:", newAppointment);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

    // TODO: Implement actual Firestore saving logic here
    // Example:
    // const { getFirestore } = await import('firebase-admin/firestore');
    // const db = getFirestore();
    // await db.collection('appointments').add(newAppointment);

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
