
export interface Doctor {
  id: string; // Firestore document ID
  name: string;
  specialty?: string; // Specialty is now optional
}

export interface AppointmentRequest {
  name: string;
  appointmentDateTime: Date; // Combined date and time for client-side use
  preferredTime: string; // The string time slot selected, e.g., "02:30 PM"
  doctorId: string;
  isOnline: boolean;
  contactNumber?: string;
  userEmail?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  paymentId?: string; // Razorpay Payment ID
  orderId?: string; // Razorpay Order ID
  signature?: string; // Razorpay Signature for verification
}

// User type for authentication
export interface User {
  id: string;
  name: string;
  email: string;
  contactNumber?: string;
  password?: string; // Password stored for testing - NOT FOR PRODUCTION
  imageUrl?: string;
  createdAt?: Date; // Added for Firestore record
}
