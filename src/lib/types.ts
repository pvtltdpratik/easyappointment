
export interface Doctor {
  id: string; // Firestore document ID
  name: string;
  specialty?: string; // Specialty is now optional
}

export interface AppointmentRequest {
  name: string;
  preferredDate: Date;
  preferredTime: string;
  doctorId: string;
  isOnline: boolean;
  contactNumber?: string;
  userEmail?: string;
  createdAt: Date;
}

// New User type for authentication
export interface User {
  id: string;
  name: string;
  email: string;
  contactNumber?: string;
  password?: string; // Password stored for testing - NOT FOR PRODUCTION
  imageUrl?: string;
}
