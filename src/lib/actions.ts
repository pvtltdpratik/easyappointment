
"use server";

import type { z } from "zod";
import type { AppointmentRequest, User, Doctor } from "./types";
import { appointmentSchema, loginSchema, registrationSchema } from "./schemas";
import { db } from "./firebase";
import { collection, addDoc, query, where, getDocs, Timestamp, doc, setDoc } from "firebase/firestore";

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

  try {
    const patientsCollection = collection(db, "patients");
    const q = query(patientsCollection, where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return {
        errors: { email: ["User with this email already exists."] },
        message: "Registration failed.",
        success: false,
      };
    }

    // Create a new document with an auto-generated ID
    const newUserRef = doc(collection(db, "patients"));
    const newUserId = newUserRef.id;
    
    const newUser: User = {
      id: newUserId, // Use Firestore generated ID
      name,
      email,
      contactNumber: contactNumber || undefined,
      password, // Storing plain text password for testing
      createdAt: new Date(), // Will be converted to Timestamp by Firestore
    };

    // Firestore handles Date to Timestamp conversion automatically
    const patientDataToSave = {
        name: newUser.name,
        email: newUser.email,
        contactNumber: newUser.contactNumber || null,
        password: newUser.password, // Storing plain text password
        createdAt: Timestamp.fromDate(newUser.createdAt!),
    };
    
    await setDoc(newUserRef, patientDataToSave);

    const { password: _, ...userWithoutPassword } = newUser;

    return {
      message: "Registration successful! You can now log in.",
      user: userWithoutPassword,
      success: true,
    };
  } catch (error) {
    console.error("Firestore registration error:", error);
    let errorMessage = "Database Error: Failed to register user.";
    if (error instanceof Error && error.message) {
        errorMessage = `Failed to register: ${error.message}`;
    }
    return {
      message: errorMessage,
      errors: { _form: ["An unexpected error occurred during registration."] },
      success: false,
    };
  }
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

  const { email, password: inputPassword } = validatedFields.data;

  try {
    const patientsCollection = collection(db, "patients");
    const q = query(patientsCollection, where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return {
        errors: { _form: ["Invalid email or password."] },
        message: "Login failed.",
        success: false,
      };
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    if (userData.password !== inputPassword) { // Comparing plain text passwords
      return {
        errors: { _form: ["Invalid email or password."] },
        message: "Login failed.",
        success: false,
      };
    }

    const user: User = {
      id: userDoc.id,
      name: userData.name,
      email: userData.email,
      contactNumber: userData.contactNumber || undefined,
      // Do not include password in the object returned to client
      imageUrl: userData.imageUrl || undefined, // Assuming imageUrl might exist
      createdAt: userData.createdAt ? (userData.createdAt as Timestamp).toDate() : undefined,
    };
    
    return {
      message: "Login successful!",
      user: user, // User object without password
      success: true,
    };

  } catch (error) {
    console.error("Firestore login error:", error);
    let errorMessage = "Database Error: Failed to log in.";
     if (error instanceof Error && error.message) {
        errorMessage = `Failed to log in: ${error.message}`;
    }
    return {
      message: errorMessage,
      errors: { _form: ["An unexpected error occurred during login."] },
      success: false,
    };
  }
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

  const { name, contactNumber, preferredDate, preferredTime, doctorId, isOnline } = validatedFields.data;

  // Combine preferredDate and preferredTime into a single appointmentDateTime
  const [time, period] = preferredTime.split(' ');
  const [hoursStr, minutesStr] = time.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  if (period.toUpperCase() === 'PM' && hours < 12) {
    hours += 12;
  } else if (period.toUpperCase() === 'AM' && hours === 12) { // Handle 12 AM (midnight)
    hours = 0;
  }

  const appointmentDateTimeJS = new Date(preferredDate);
  appointmentDateTimeJS.setHours(hours, minutes, 0, 0); // Set hours, minutes, seconds, ms

  const now = Timestamp.now();

  const appointmentToSave = {
    name,
    contactNumber: contactNumber || null,
    appointmentDateTime: Timestamp.fromDate(appointmentDateTimeJS),
    preferredTime, // Store the original string time as well
    doctorId,
    isOnline,
    status: "Scheduled", // Default status
    createdAt: now,
    updatedAt: now,
  };

  try {
    const docRef = await addDoc(collection(db, "appointments"), appointmentToSave);
    console.log("Appointment saved to Firestore with ID: ", docRef.id);

    const newAppointmentForClient: AppointmentRequest = {
      name: appointmentToSave.name,
      appointmentDateTime: appointmentDateTimeJS,
      preferredTime: appointmentToSave.preferredTime,
      doctorId: appointmentToSave.doctorId,
      isOnline: appointmentToSave.isOnline,
      contactNumber: appointmentToSave.contactNumber || undefined,
      status: appointmentToSave.status,
      createdAt: now.toDate(),
      updatedAt: now.toDate(),
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
        id: doc.id,
        name: data.name || "Unnamed Doctor",
        specialty: data.specialty || undefined,
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
