
"use server";

import type { z } from "zod";
import type { AppointmentRequest, User, Doctor } from "./types"; // Added Doctor type
import { appointmentSchema, loginSchema, registrationSchema } from "./schemas";
import { db } from "./firebase";
import { collection, addDoc, Timestamp, getDocs } from "firebase/firestore"; // Import Firestore functions

export type AppointmentFormState = {
  message?: string | null;
  errors?: {
    name?: string[];
    contactNumber?: string[];
    preferredDate?: string[];
    preferredTime?: string[];
    doctorId?: string[];
    isOnline?: string[];
    _form?: string[];
  };
  appointment?: AppointmentRequest | null;
  success?: boolean;
}

// IMPORTANT: This is a mock in-memory database for testing purposes only for auth.
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

  if (mockPatientsDB.some(user => user.email === email)) {
    return {
      errors: { email: ["User with this email already exists."] },
      message: "Registration failed.",
      success: false,
    };
  }

  const newUser: User = {
    id: Date.now().toString(),
    name,
    email,
    contactNumber: contactNumber || undefined,
    password,
  };

  mockPatientsDB.push(newUser);
  console.log("Mock DB after registration:", mockPatientsDB);

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

  if (!user || user.password !== password) {
    return {
      errors: { _form: ["Invalid email or password."] },
      message: "Login failed.",
      success: false,
    };
  }

  console.log("Mock DB user found for login:", user);
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

  const appointmentInputData = validatedFields.data;

  const appointmentToSave = {
    ...appointmentInputData,
    preferredDate: Timestamp.fromDate(appointmentInputData.preferredDate),
    createdAt: Timestamp.now(),
  };

  try {
    const docRef = await addDoc(collection(db, "appointments"), appointmentToSave);
    console.log("Appointment saved to Firestore with ID: ", docRef.id);

    const newAppointmentForClient: AppointmentRequest = {
      ...appointmentInputData,
      preferredDate: appointmentInputData.preferredDate,
      createdAt: new Date(),
    };

    return {
      message: "Appointment created successfully and saved to Firestore!",
      appointment: newAppointmentForClient,
      success: true,
    };
  } catch (error) {
    console.error("Failed to create appointment in Firestore:", error);
    let errorMessage = "Database Error: Failed to save appointment to Firestore.";
    if (error instanceof Error && error.message) {
        errorMessage = `Failed to save to Firestore: ${error.message}`;
    }
    return {
        message: errorMessage,
        errors: { _form: ["An unexpected error occurred while saving the appointment to Firestore."] },
        success: false,
    };
  }
}

export type GetDoctorsState = {
  doctors?: Doctor[];
  error?: string | null;
  success: boolean;
};

export async function getDoctorsAction(): Promise<GetDoctorsState> {
  try {
    const doctorsCollection = collection(db, "doctors");
    const doctorSnapshot = await getDocs(doctorsCollection);
    const doctorsList: Doctor[] = doctorSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id, // Use Firestore document ID
        name: data.name || "Unnamed Doctor", // From Firestore 'name' field
        specialty: data.specialty || undefined, // From Firestore 'specialty' field, if it exists
      };
    });

    if (doctorsList.length === 0) {
      console.warn("No doctors found in Firestore 'doctors' collection.");
    }

    return { doctors: doctorsList, success: true };
  } catch (error) {
    console.error("Error fetching doctors from Firestore:", error);
    let errorMessage = "Database Error: Failed to fetch doctors.";
    if (error instanceof Error && error.message) {
        errorMessage = `Failed to fetch doctors: ${error.message}`;
    }
    return { error: errorMessage, success: false };
  }
}
