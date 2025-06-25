
export interface Doctor {
  id: string; // Firestore document ID
  name: string;
  specialty?: string; 
}

export interface AppointmentRequest {
  id: string; // Firestore document ID, added after creation
  name: string;
  appointmentDateTime: Date; 
  preferredTime: string; 
  doctorId: string;
  isOnline: boolean;
  contactNumber?: string;
  address?: string;
  BP?: string;
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

// User type for authentication
export interface User {
  id: string;
  name: string;
  email: string;
  contactNumber?: string;
  password?: string; // Password stored for testing - NOT FOR PRODUCTION
  imageUrl?: string;
  address?: string;
  createdAt?: Date; 
}
