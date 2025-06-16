
"use server";

import type { z } from "zod";
import type { AppointmentRequest, User, Doctor } from "./types";
import { appointmentSchema, loginSchema, registrationSchema } from "./schemas";
import { db } from "./firebase";
import { collection, addDoc, query, where, getDocs, Timestamp, doc, setDoc } from "firebase/firestore";
import Razorpay from "razorpay";

const CONSULTATION_FEE_PAISE = 50000; // 500.00 INR, used for online consultations

// Helper to generate standard time slots (9 AM - 5 PM, 30-min intervals)
const generateStandardTimeSlots = () => {
  const slots = [];
  // 9:00 AM to 4:30 PM (inclusive start times for 30-min slots, last slot starts 4:30 PM, ends 5:00 PM)
  // This means 16 slots (9:00, 9:30 ... 16:00, 16:30)
  for (let i = 0; i < 16; i++) { 
    const hour = 9 + Math.floor(i / 2);
    const minute = i % 2 === 0 ? "00" : "30";
    const period = hour < 12 || hour === 24 ? "AM" : "PM"; // hour 24 would be 12 AM next day, not applicable here
    let displayHour = hour;
    if (hour > 12) displayHour = hour - 12;
    if (hour === 0) displayHour = 12; // Should not happen with 9-16 range
    if (hour === 12) displayHour = 12; // Noon is 12 PM
    
    slots.push(`${String(displayHour).padStart(2, '0')}:${minute} ${period}`);
  }
  return slots;
};
const allPossibleTimeSlots = generateStandardTimeSlots();


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
  slotAvailable?: boolean;
  suggestions?: string[];
  suggestionMessage?: string;
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  // 1. Construct and validate the selected date and time
  const [timeStr, period] = preferredTime.split(' ');
  const [hoursStr, minutesStr] = timeStr.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  if (period.toUpperCase() === 'PM' && hours < 12) {
    hours += 12;
  } else if (period.toUpperCase() === 'AM' && hours === 12) { // 12 AM is midnight
    hours = 0;
  }

  // Robust construction of appointmentDateTimeJS:
  // preferredDate is a JS Date object from the client, representing their local midnight for the selected day.
  // Its getTime() gives a UTC timestamp. We add the selected hours and minutes to this UTC timestamp.
  const appointmentTimestamp = preferredDate.getTime() + 
                               (hours * 60 * 60 * 1000) + 
                               (minutes * 60 * 1000);
  const appointmentDateTimeJS = new Date(appointmentTimestamp);
  
  const nowServer = new Date(); 

  if (appointmentDateTimeJS < nowServer) {
    return {
      message: "Cannot book appointments in the past. Please select a future date or time.",
      success: false,
      slotAvailable: false,
    };
  }
  
  // 2. Checks time slot availability
  const appointmentsCollectionRef = collection(db, "appointments");
  
  // Create a date range for the entire preferredDate (client's local day)
  // For Firestore query, we need UTC start and end of that client's local day.
  const clientDayStart = new Date(preferredDate); // This is client's local midnight.
  clientDayStart.setHours(0,0,0,0); // Ensure it's exactly midnight client local time

  const clientDayEnd = new Date(preferredDate);
  clientDayEnd.setHours(23,59,59,999); // End of client's local day

  const q = query(
    appointmentsCollectionRef,
    where("doctorId", "==", doctorId),
    where("appointmentDateTime", ">=", Timestamp.fromDate(clientDayStart)),
    where("appointmentDateTime", "<=", Timestamp.fromDate(clientDayEnd)),
    where("status", "in", ["Scheduled", "Paid & Scheduled"]) 
  );

  try {
    const querySnapshot = await getDocs(q);
    const bookedTimesOnDay = querySnapshot.docs.map(doc => doc.data().preferredTime as string);

    if (bookedTimesOnDay.includes(preferredTime)) {
      // 3. Suggests alternatives if the slot is taken
      const availableSlotsToday: string[] = [];
      const preferredTimeIndex = allPossibleTimeSlots.indexOf(preferredTime); 

      for (let i = 0; i < allPossibleTimeSlots.length; i++) {
        const slot = allPossibleTimeSlots[i];
        if (bookedTimesOnDay.includes(slot)) continue; 

        const slotParts = slot.split(' ');
        const slotTimeParts = slotParts[0].split(':');
        let slotHours = parseInt(slotTimeParts[0], 10);
        const slotMinutes = parseInt(slotTimeParts[1], 10);
        if (slotParts[1].toUpperCase() === 'PM' && slotHours < 12) slotHours += 12;
        if (slotParts[1].toUpperCase() === 'AM' && slotHours === 12) slotHours = 0; 
        
        const slotTimestamp = preferredDate.getTime() +
                              (slotHours * 60 * 60 * 1000) +
                              (slotMinutes * 60 * 1000);
        const slotDateTime = new Date(slotTimestamp);
        
        if (slotDateTime > nowServer) { 
            if (i > preferredTimeIndex && availableSlotsToday.length < 3) {
                 availableSlotsToday.push(slot);
            } else if (preferredTimeIndex === -1 && availableSlotsToday.length < 3) { 
                 availableSlotsToday.push(slot);
            }
        }
      }
      
      const preferredDateString = preferredDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric'});
      let suggestionMessage = `The selected slot (${preferredTime}) on ${preferredDateString} is already booked.`;
      if (availableSlotsToday.length > 0) {
        suggestionMessage += ` Suggested available slots for ${preferredDateString}: ${availableSlotsToday.join(", ")}.`;
      } else {
        suggestionMessage += ` No other slots are available on ${preferredDateString}. Please try another date.`;
      }
      
      return {
        message: suggestionMessage,
        success: false,
        slotAvailable: false,
        suggestions: availableSlotsToday,
        suggestionMessage: suggestionMessage,
      };
    }

    // If slot is available, proceed to create appointment
    const now = Timestamp.now();
    const appointmentType = isOnline ? "Online" : "Clinic";

    const appointmentToSave: Omit<AppointmentRequest, 'id' | 'appointmentDateTime' | 'createdAt' | 'updatedAt' | 'paidAt'> & { appointmentDateTime: Timestamp, createdAt: Timestamp, updatedAt: Timestamp, paidAt?: Timestamp } = {
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
        appointmentToSave.paymentMethod = "Razorpay"; 
      }
    } else { 
      appointmentToSave.paymentStatus = "PayAtClinic";
      appointmentToSave.paymentMethod = "Offline";
    }

    const docRef = await addDoc(collection(db, "appointments"), appointmentToSave);
    
    const newAppointmentForClient: AppointmentRequest = {
      id: docRef.id,
      ...appointmentToSave,
      appointmentDateTime: appointmentDateTimeJS, 
      createdAt: now.toDate(),
      updatedAt: now.toDate(),
      paidAt: appointmentToSave.paidAt ? appointmentToSave.paidAt.toDate() : undefined,
    };

    return {
      message: "Appointment created successfully!",
      appointment: newAppointmentForClient,
      success: true,
      slotAvailable: true,
    };

  } catch (error) {
    console.error("Error during appointment creation or availability check:", error);
    let errorMessage = "Database Error: Failed to process appointment.";
    if (error instanceof Error && error.message) {
        errorMessage = `Failed to process appointment: ${error.message}`;
    }
    return {
        message: errorMessage,
        errors: { _form: ["An unexpected error occurred."] },
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
      amount: amount, 
      currency: "INR",
      receipt: `receipt_order_${new Date().getTime()}`, 
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
    if (typeof error === 'object' && error !== null && 'error' in error && typeof error.error === 'object' && error.error !== null && 'description' in error.error) {
        errorMessage = `Razorpay Error: ${ (error.error as {description: string}).description }`;
    }
    return { success: false, error: errorMessage };
  }
}
    
      