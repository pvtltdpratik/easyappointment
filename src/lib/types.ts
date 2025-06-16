
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
  status: string; // Overall status like "Scheduled", "Paid & Scheduled", "Cancelled"
  createdAt: Date;
  updatedAt: Date;
  
  // Payment Integration Fields
  paymentId?: string; // Razorpay Payment ID (serves as transactionId)
  orderId?: string; // Razorpay Order ID
  signature?: string; // Razorpay Signature for verification
  appointmentType?: "Online" | "Clinic"; // Type of appointment
  paymentStatus?: "Paid" | "Pending" | "Failed" | "PayAtClinic" | "Refunded"; // Status of the payment
  paymentMethod?: string; // e.g., "Razorpay", "Credit Card", "UPI", "Offline", "Cash"
  amount?: number; // Amount paid or due
  currency?: string; // e.g., "INR", "USD"
  paidAt?: Date; // Timestamp of when payment was successfully made
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

