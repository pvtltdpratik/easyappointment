
"use server";

import type { z } from "zod";
import type { AppointmentRequest, User, Doctor } from "./types";
import { appointmentSchema, loginSchema, registrationSchema } from "./schemas";
import { db } from "./firebase";
import { collection, addDoc, query, where, getDocs, Timestamp, doc, setDoc, updateDoc, runTransaction } from "firebase/firestore";
import Razorpay from "razorpay";

const CONSULTATION_FEE_PAISE = 99900; // 999.00 INR, used for online consultations

export type AppointmentFormState = {
  message?: string | null;
  errors?: {
    name?: string[];
    age?: string[];
    contactNumber?: string[];
    address?: string[];
    preferredDate?: string[];
    preferredTime?: string[];
    doctorId?: string[];
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

    const newRegistrationId = await runTransaction(db, async (transaction) => {
        const counterRef = doc(db, "counters", "patientRegistration");
        const counterDoc = await transaction.get(counterRef);

        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const dateString = `${year}${month}${day}`;

        let newSequence = 1;
        const dailyCounts = counterDoc.exists() ? counterDoc.data().dailyCounts || {} : {};

        if (dailyCounts[dateString]) {
            newSequence = dailyCounts[dateString] + 1;
        }

        const newDailyCounts = { ...dailyCounts, [dateString]: newSequence };
        transaction.set(counterRef, { dailyCounts: newDailyCounts }, { merge: true });

        const sequenceString = String(newSequence).padStart(4, '0');
        return `RUBY${dateString}${sequenceString}`;
    });

    const newUserRef = doc(db, "patients", newRegistrationId);

    const nameParts = name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const patientDataToSave: Omit<User, "id" | "name" | "password"> & { createdAt: Timestamp, updatedAt: Timestamp } = {
      // From form
      firstName: firstName,
      lastName: lastName,
      email: email,
      mobileNumber: contactNumber || "",
      
      // Default empty values
      salutation: "",
      middleName: "",
      gender: "",
      age: "",
      dateOfBirth: undefined,
      maritalStatus: "",
      religion: "",
      occupation: "",
      education: "",
      socioEconomic: "",
      telephone: "",
      permanentAddress: "",
      currentAddress: "",
      city: "",
      birthMark: "",
      idProofNumber: "",
      referredBy: "",
      accompaniedBy: "",
      emrNumber: "",
      pulse: "",
      weight: "",
      since: "",
      alongWith: "",
      imageUrl: undefined,

      // System generated
      patientId: newRegistrationId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await setDoc(newUserRef, { ...patientDataToSave, password: password });


    const userToReturn: User = {
      id: newRegistrationId,
      ...patientDataToSave,
      name: name,
      password: password,
      createdAt: patientDataToSave.createdAt.toDate(),
      updatedAt: patientDataToSave.updatedAt.toDate(),
      dateOfBirth: patientDataToSave.dateOfBirth, // It's already undefined, so this is fine
    };

    return {
      message: "Registration successful! You can now log in.",
      user: userToReturn,
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
    const userData = userDoc.data() as User;

    if (userData.password !== inputPassword) {
      return {
        errors: { _form: ["Invalid email or password."] },
        message: "Login failed.",
        success: false,
      };
    }

    const user: User = {
      id: userDoc.id,
      ...userData,
      name: [userData.firstName, userData.lastName].filter(Boolean).join(' '),
      dateOfBirth: userData.dateOfBirth ? (userData.dateOfBirth as unknown as Timestamp).toDate() : undefined,
      createdAt: userData.createdAt ? (userData.createdAt as unknown as Timestamp).toDate() : undefined,
      updatedAt: userData.updatedAt ? (userData.updatedAt as unknown as Timestamp).toDate() : undefined,
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

  const { name, age, contactNumber, address, preferredDate, preferredTime, doctorId, paymentId, orderId, signature } = validatedFields.data;

  // --- Patient Registration/Update Logic ---
  if (contactNumber && contactNumber.trim() !== '') {
    try {
      const patientsCollection = collection(db, "patients");
      const q = query(patientsCollection, where("mobileNumber", "==", contactNumber));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        const newRegistrationId = await runTransaction(db, async (transaction) => {
            const counterRef = doc(db, "counters", "patientRegistration");
            const counterDoc = await transaction.get(counterRef);
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const dateString = `${year}${month}${day}`;
            let newSequence = 1;
            const dailyCounts = counterDoc.exists() ? counterDoc.data().dailyCounts || {} : {};
            if (dailyCounts[dateString]) {
                newSequence = dailyCounts[dateString] + 1;
            }
            const newDailyCounts = { ...dailyCounts, [dateString]: newSequence };
            transaction.set(counterRef, { dailyCounts: newDailyCounts }, { merge: true });
            const sequenceString = String(newSequence).padStart(4, '0');
            return `RUBY${dateString}${sequenceString}`;
        });

        const newPatientRef = doc(db, "patients", newRegistrationId);
        const nameParts = name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const newPatientData: Omit<User, "id" | "name" | "password"> & { createdAt: Timestamp, updatedAt: Timestamp } = {
            salutation: "",
            firstName: firstName,
            middleName: "",
            lastName: lastName,
            gender: "",
            age: age ? String(age) : "",
            dateOfBirth: undefined,
            maritalStatus: "",
            religion: "",
            occupation: "",
            education: "",
            socioEconomic: "",
            mobileNumber: contactNumber || "",
            telephone: "",
            email: "",
            permanentAddress: address || "",
            currentAddress: "",
            city: "",
            birthMark: "",
            idProofNumber: "",
            referredBy: "",
            accompaniedBy: "",
            emrNumber: "",
            pulse: "",
            weight: "",
            since: "",
            alongWith: "",
            imageUrl: undefined,
            patientId: newRegistrationId,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };
        await setDoc(newPatientRef, newPatientData);
      } else {
        const patientDocRef = querySnapshot.docs[0].ref;
        const updateData: { permanentAddress?: string; age?: string, updatedAt?: Timestamp } = {
            updatedAt: Timestamp.now()
        };
        if (address) {
          updateData.permanentAddress = address;
        }
        if (typeof age === 'number') {
          updateData.age = String(age);
        }
        if (Object.keys(updateData).length > 1) { // only update if there's more than just the timestamp
           await updateDoc(patientDocRef, updateData);
        }
      }
    } catch (error) {
        console.error("Error during patient registration/update:", error);
    }
  }
  // --- End Patient Logic ---


  // Format the date to create the collection name
  const year = preferredDate.getFullYear();
  const month = String(preferredDate.getMonth() + 1).padStart(2, '0');
  const day = String(preferredDate.getDate()).padStart(2, '0');
  const collectionName = `${year}-${month}-${day}-appointments`;

  const appointmentDateMillis = preferredDate.getTime();
  const [timeStr, period] = preferredTime.split(' ');
  const [hoursStr, minutesStr] = timeStr.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  if (period.toUpperCase() === 'PM' && hours < 12) {
    hours += 12;
  } else if (period.toUpperCase() === 'AM' && hours === 12) {
    hours = 0;
  }
  const timeOffsetMillis = (hours * 60 * 60 * 1000) + (minutes * 60 * 1000);
  const appointmentDateTimeJS = new Date(appointmentDateMillis + timeOffsetMillis);

  try {
    const now = Timestamp.now();
    const isOnline = true;
    const appointmentType = "Online";

    const appointmentToSave: Omit<AppointmentRequest, 'id' | 'appointmentDateTime' | 'createdAt' | 'updatedAt' | 'paidAt'> & { appointmentDateTime: Timestamp, createdAt: Timestamp, updatedAt: Timestamp, paidAt?: Timestamp } = {
      name,
      age: age || undefined,
      contactNumber: contactNumber || undefined,
      address: address || undefined,
      appointmentDateTime: Timestamp.fromDate(appointmentDateTimeJS),
      preferredTime,
      doctorId,
      isOnline,
      appointmentType,
      status: "Scheduled",
      createdAt: now,
      updatedAt: now,
    };

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
         return {
            message: "Payment details are missing. Appointment could not be scheduled.",
            errors: { _form: ["Payment details were not received. Please try again or contact support."] },
            success: false,
        };
      }

    const docRef = await addDoc(collection(db, collectionName), appointmentToSave);

    await setDoc(doc(db, "appointments", docRef.id), appointmentToSave);

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
    };

  } catch (error) {
    console.error("Error during appointment creation:", error);
    let errorMessage = "Database Error: Failed to create appointment.";
    if (error instanceof Error && error.message) {
        errorMessage = `Failed to create appointment: ${error.message}`;
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
