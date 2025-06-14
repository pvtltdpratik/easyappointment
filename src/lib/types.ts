
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
  userEmail?: string;
  createdAt: Date;
}

// New User type for authentication
export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Password stored for testing - NOT FOR PRODUCTION
  imageUrl?: string;
}
