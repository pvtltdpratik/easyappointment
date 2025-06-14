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
