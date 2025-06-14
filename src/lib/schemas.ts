
import { z } from "zod";

export const appointmentSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).max(100, { message: "Name must be 100 characters or less."}),
  preferredDate: z.date({
    required_error: "A date for the appointment is required.",
    invalid_type_error: "That's not a valid date!",
  }),
  preferredTime: z.string().min(1, { message: "Please select a preferred time." }),
  doctorId: z.string().min(1, { message: "Please select a doctor." }),
  isOnline: z.boolean().default(false),
});
