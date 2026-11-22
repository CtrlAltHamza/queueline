export interface Business {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: "clinic" | "salon";
  timezone: string;
  deposit_cents: number;
  currency: string;
  address: string;
  phone: string;
}

export interface Service {
  id: string;
  business_id: string;
  name: string;
  description: string;
  duration_min: number;
  price_cents: number;
  is_active: boolean;
}

export interface BusinessHours {
  weekday: number;
  opens: string;
  closes: string;
  is_closed: boolean;
}

export interface Booking {
  id: string;
  business_id: string;
  service_id: string;
  service_name?: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  starts_at: string;
  ends_at: string;
  status: "pending_payment" | "confirmed" | "cancelled" | "no_show" | "completed";
  deposit_amount_cents: number;
  notes?: string;
}

export interface QueueEntry {
  id: string;
  business_id: string;
  customer_name: string;
  customer_phone?: string;
  ticket_no: string;
  status: "waiting" | "called" | "served" | "no_show" | "left";
  estimated_wait_min: number;
  created_at: string;
}

export const INITIAL_BUSINESSES: Business[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    slug: "glow-clinic",
    name: "Glow Aesthetic Clinic & Wellness",
    description: "Premier medical spa offering advanced laser treatments, skincare, and restorative wellness therapies.",
    category: "clinic",
    timezone: "America/New_York",
    deposit_cents: 3000,
    currency: "USD",
    address: "450 Lexington Ave, Suite 400, New York, NY",
    phone: "+1 (212) 555-0199",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    slug: "urban-blade",
    name: "Urban Blade Barber & Grooming Lounge",
    description: "Modern gentleman barber studio specializing in precision haircuts, hot towel shaves, and beard craft.",
    category: "salon",
    timezone: "America/New_York",
    deposit_cents: 1500,
    currency: "USD",
    address: "128 Bedford Ave, Brooklyn, NY",
    phone: "+1 (718) 555-0144",
  },
];

export const INITIAL_SERVICES: Service[] = [
  {
    id: "33333333-1111-1111-1111-111111111111",
    business_id: "11111111-1111-1111-1111-111111111111",
    name: "HydraFacial Deluxe",
    description: "Deep pore cleansing, exfoliation, hydration, and LED light therapy for a radiant glow.",
    duration_min: 45,
    price_cents: 17500,
    is_active: true,
  },
  {
    id: "33333333-1111-1111-1111-111111111112",
    business_id: "11111111-1111-1111-1111-111111111111",
    name: "Microneedling Collagen Boost",
    description: "Collagen induction therapy for skin tightening, acne scars, and smoothing.",
    duration_min: 60,
    price_cents: 25000,
    is_active: true,
  },
  {
    id: "33333333-1111-1111-1111-111111111113",
    business_id: "11111111-1111-1111-1111-111111111111",
    name: "Laser Therapy - Targeted Rejuvenation",
    description: "Diode laser therapy for redness reduction, tone correction, and skin texture.",
    duration_min: 30,
    price_cents: 9500,
    is_active: true,
  },
  {
    id: "33333333-2222-2222-2222-222222222221",
    business_id: "22222222-2222-2222-2222-222222222222",
    name: "Signature Fade & Scissor Cut",
    description: "Custom precision haircut including hot lather neck shave and styling.",
    duration_min: 35,
    price_cents: 4500,
    is_active: true,
  },
  {
    id: "33333333-2222-2222-2222-222222222222",
    business_id: "22222222-2222-2222-2222-222222222222",
    name: "Traditional Hot Towel Shave",
    description: "Aromatherapy steam, pre-shave botanical oils, rich lather, and straight razor.",
    duration_min: 40,
    price_cents: 5000,
    is_active: true,
  },
];

export const INITIAL_HOURS: BusinessHours[] = [
  { weekday: 0, opens: "10:00", closes: "16:00", is_closed: true },
  { weekday: 1, opens: "09:00", closes: "18:00", is_closed: false },
  { weekday: 2, opens: "09:00", closes: "18:00", is_closed: false },
  { weekday: 3, opens: "09:00", closes: "18:00", is_closed: false },
  { weekday: 4, opens: "09:00", closes: "18:00", is_closed: false },
  { weekday: 5, opens: "09:00", closes: "19:00", is_closed: false },
  { weekday: 6, opens: "10:00", closes: "17:00", is_closed: false },
];

export const INITIAL_QUEUE_ENTRIES: QueueEntry[] = [
  {
    id: "q-101",
    business_id: "11111111-1111-1111-1111-111111111111",
    customer_name: "Sarah Jenkins",
    customer_phone: "+1 (555) 234-5678",
    ticket_no: "A012",
    status: "served",
    estimated_wait_min: 0,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "q-102",
    business_id: "11111111-1111-1111-1111-111111111111",
    customer_name: "David Ross",
    customer_phone: "+1 (555) 345-6789",
    ticket_no: "A013",
    status: "called",
    estimated_wait_min: 0,
    created_at: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: "q-103",
    business_id: "11111111-1111-1111-1111-111111111111",
    customer_name: "Emma Watson",
    customer_phone: "+1 (555) 456-7890",
    ticket_no: "A014",
    status: "waiting",
    estimated_wait_min: 15,
    created_at: new Date(Date.now() - 600000).toISOString(),
  },
  {
    id: "q-104",
    business_id: "11111111-1111-1111-1111-111111111111",
    customer_name: "Michael Chang",
    customer_phone: "+1 (555) 567-8901",
    ticket_no: "A015",
    status: "waiting",
    estimated_wait_min: 30,
    created_at: new Date(Date.now() - 300000).toISOString(),
  },
];

export const INITIAL_BOOKINGS: Booking[] = [
  {
    id: "b-001",
    business_id: "11111111-1111-1111-1111-111111111111",
    service_id: "33333333-1111-1111-1111-111111111111",
    service_name: "HydraFacial Deluxe",
    customer_name: "Jessica Alba",
    customer_email: "jessica@example.com",
    starts_at: new Date(Date.now() + 86400000).toISOString(),
    ends_at: new Date(Date.now() + 86400000 + 45 * 60000).toISOString(),
    status: "confirmed",
    deposit_amount_cents: 3000,
    notes: "First time visit, sensitive skin.",
  },
  {
    id: "b-002",
    business_id: "11111111-1111-1111-1111-111111111111",
    service_id: "33333333-1111-1111-1111-111111111112",
    service_name: "Microneedling Collagen Boost",
    customer_name: "Marcus Vance",
    customer_email: "marcus@example.com",
    starts_at: new Date(Date.now() + 172800000).toISOString(),
    ends_at: new Date(Date.now() + 172800000 + 60 * 60000).toISOString(),
    status: "confirmed",
    deposit_amount_cents: 3000,
    notes: "Follow-up session.",
  },
];
