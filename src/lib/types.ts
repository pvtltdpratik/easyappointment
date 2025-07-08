
export interface Doctor {
  id: string; // Firestore document ID
  name: string;
  specialty?: string;
}

export interface AppointmentRequest {
  id: string; // Firestore document ID, added after creation
  name: string;
  age?: number;
  appointmentDateTime: Date;
  preferredTime: string;
  doctorId: string;
  isOnline: boolean;
  contactNumber?: string;
  address?: string;
  userEmail?: string; // Optional: if linking appointments to registered users
  status: string;
  createdAt: Date;
  updatedAt: Date;

  // Payment Integration Fields
  paymentId?: string;
  orderId?: string;
  signature?: string;
  appointmentType?: "Online" | "Clinic";
  paymentStatus?: "Paid" | "Pending" | "Failed" | "PayAtClinic" | "Refunded";
  paymentMethod?: string;
  amount?: number;
  currency?: string;
  paidAt?: Date;
}

// User type for authentication based on the new detailed schema
export interface User {
  id: string; // document id
  salutation?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  name: string; // For display: "firstName lastName"
  gender?: string;
  age?: string; // Note: stored as string
  dateOfBirth?: Date;
  maritalStatus?: string;
  religion?: string;
  occupation?: string;
  education?: string;
  socioEconomic?: string;
  mobileNumber?: string;
  telephone?: string;
  email: string;
  permanentAddress?: string;
  currentAddress?: string;
  city?: string;
  birthMark?: string;
  idProofNumber?: string;
  referredBy?: string;
  accompaniedBy?: string;
  emrNumber?: string;
  patientId?: string; // This is the registrationId: RUBY...
  pulse?: string;
  weight?: string;
  since?: string;
  alongWith?: string;
  createdAt?: Date;
  updatedAt?: Date;
  password?: string; // For login check
  imageUrl?: string; // Kept from previous version
}
