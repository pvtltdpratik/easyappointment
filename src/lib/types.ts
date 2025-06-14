
export interface Doctor {
  id: string;
  name: string;
  specialty: string;
}

export interface AppointmentRequest {
  name: string;
  preferredDate: Date;
  preferredTime: string;
  doctorId: string;
  isOnline: boolean;
  contactNumber?: string; // Added contact number
  userEmail?: string;
  createdAt: Date;
}

// New User type for authentication
export interface User {
  id: string;
  name: string;
  email: string;
  contactNumber?: string; // Added contact number
  password?: string; // Password stored for testing - NOT FOR PRODUCTION
  imageUrl?: string;
}
