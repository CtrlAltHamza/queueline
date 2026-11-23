import { z } from "zod";

export const uuidSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "Invalid UUID");

export const CreateBookingSchema = z.object({
  business_id: uuidSchema,
  service_id: uuidSchema,
  staff_id: uuidSchema.optional().nullable(),
  customer_name: z.string().min(2, "Name must be at least 2 characters"),
  customer_email: z.string().email("Valid email address required"),
  customer_phone: z.string().optional().nullable(),
  starts_at: z.string().datetime({ message: "Invalid ISO start time" }),
  notes: z.string().max(500).optional().nullable(),
});

export const JoinQueueSchema = z.object({
  business_id: uuidSchema,
  customer_name: z.string().min(2, "Name must be at least 2 characters"),
  customer_phone: z.string().min(7, "Valid phone number required"),
});

export const CancelBookingSchema = z.object({
  booking_id: uuidSchema,
});

export const UpdateServiceSchema = z.object({
  id: uuidSchema.optional(),
  business_id: uuidSchema,
  name: z.string().min(2, "Service name required"),
  description: z.string().optional().nullable(),
  duration_min: z.number().int().min(5).max(480),
  price_cents: z.number().int().min(0),
  is_active: z.boolean().default(true),
});

export const UpdateHoursSchema = z.object({
  business_id: uuidSchema,
  weekday: z.number().int().min(0).max(6),
  opens: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:mm required"),
  closes: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:mm required"),
  is_closed: z.boolean(),
});
