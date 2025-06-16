
"use server";

import type { z } from "zod";
import type { AppointmentRequest, User, Doctor } from "./types";
import { appointmentSchema, loginSchema, registrationSchema } from "./schemas";
import { db } from "./firebase";
import { collection, addDoc, query, where, getDocs, Timestamp, doc, setDoc } from "firebase/firestore";
import Razorpay from "razorpay";

const CONSULTATION_FEE_PAISE = 50000; // 500.00 INR, used for online consultations

export type AppointmentFormState = {
  message?: string | null;
  errors?: {
    name?: string[];
    contactNumber?: string[];
    preferredDate?: string[];
    preferredTime?: string[];
    doctorId?: string[];
    isOnline?: string[];
    paymentId?: string[];
    orderId?: string[];
    signature?: string[];
    appointmentType?: string[];
    paymentStatus?: string[];
    paymentMethod?: string[];
    amount?: string[];
    currency?: string[];
    paidAt?: string[];
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

export type RazorpayOrderState = {
    success: boolean;
    order?: {
        id: string;
        amount: number;
        currency: string;
    } | null;
    error?: string | null;
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

    const newUserRef = doc(collection(db, "patients"));
    const newUserId = newUserRef.id;
    
    const newUser: User = {
      id: newUserId, 
      name,
      email,
      contactNumber: contactNumber || undefined,
      password, 
      createdAt: new Date(), 
    };

    const patientDataToSave = {
        name: newUser.name,
        email: newUser.email,
        contactNumber: newUser.contactNumber || null,
        password: newUser.password, 
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

    if (userData.password !== inputPassword) { 
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
      imageUrl: userData.imageUrl || undefined, 
      createdAt: userData.createdAt ? (userData.createdAt as Timestamp).toDate() : undefined,
    };
    
    return {
      message: "Login successful!",
      user: user, 
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

  const { name, contactNumber, preferredDate, preferredTime, doctorId, isOnline, paymentId, orderId, signature } = validatedFields.data;

  const [time, period] = preferredTime.split(' ');
  const [hoursStr, minutesStr] = time.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  if (period.toUpperCase() === 'PM' && hours < 12) {
    hours += 12;
  } else if (period.toUpperCase() === 'AM' && hours === 12) { 
    hours = 0;
  }

  const appointmentDateTimeJS = new Date(preferredDate);
  appointmentDateTimeJS.setHours(hours, minutes, 0, 0); 

  const now = Timestamp.now();
  const appointmentType = isOnline ? "Online" : "Clinic";

  const appointmentToSave: Omit<AppointmentRequest, 'appointmentDateTime' | 'createdAt' | 'updatedAt' | 'paidAt'> & { appointmentDateTime: Timestamp, createdAt: Timestamp, updatedAt: Timestamp, paidAt?: Timestamp } = {
    name,
    contactNumber: contactNumber || undefined,
    appointmentDateTime: Timestamp.fromDate(appointmentDateTimeJS),
    preferredTime, 
    doctorId,
    isOnline,
    appointmentType,
    status: "Scheduled", 
    createdAt: now,
    updatedAt: now,
  };

  if (isOnline) {
    appointmentToSave.amount = CONSULTATION_FEE_PAISE;
    appointmentToSave.currency = "INR";
    if (paymentId && orderId && signature) {
      appointmentToSave.paymentId = paymentId;
      appointmentToSave.orderId = orderId;
      appointmentToSave.signature = signature;
      appointmentToSave.paymentStatus = "Paid";
      appointmentToSave.paymentMethod = "Razorpay";
      appointmentToSave.paidAt = now;
      appointmentToSave.status = "Paid & Scheduled"; 
    } else {
      appointmentToSave.paymentStatus = "Pending";
    }
  } else { // Offline appointment
    appointmentToSave.paymentStatus = "PayAtClinic";
    appointmentToSave.paymentMethod = "Offline";
    // For offline, amount/currency might be determined at clinic or different.
    // We can leave them undefined here or set a default clinic fee if applicable.
    // appointmentToSave.amount = CLINIC_FEE_PAISE; 
    // appointmentToSave.currency = "INR";
  }


  try {
    const docRef = await addDoc(collection(db, "appointments"), appointmentToSave);
    console.log("Appointment saved to Firestore with ID: ", docRef.id);

    const newAppointmentForClient: AppointmentRequest = {
      ...appointmentToSave,
      appointmentDateTime: appointmentDateTimeJS,
      createdAt: now.toDate(),
      updatedAt: now.toDate(),
      paidAt: appointmentToSave.paidAt ? appointmentToSave.paidAt.toDate() : undefined,
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


export async function createRazorpayOrderAction(data: { amount: number }): Promise<RazorpayOrderState> {
  const { amount } = data;
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error("Razorpay Key ID or Key Secret is not set in environment variables.");
    return { success: false, error: "Razorpay API keys are not configured on the server." };
  }

  try {
    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: amount, // Amount in the smallest currency unit (e.g., paise for INR)
      currency: "INR",
      receipt: `receipt_order_${new Date().getTime()}`, // Unique receipt ID
    };

    const order = await instance.orders.create(options);

    if (!order) {
      return { success: false, error: "Failed to create Razorpay order." };
    }

    return {
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
    };
  } catch (error) {
    console.error("Razorpay order creation error:", error);
    let errorMessage = "Failed to create Razorpay order due to an unexpected error.";
    if (error instanceof Error) {
        errorMessage = `Razorpay Error: ${error.message}`;
    }
    return { success: false, error: errorMessage };
  }
}

