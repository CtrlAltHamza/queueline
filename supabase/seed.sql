-- Seed Data for QueueLine

-- 1. Demo Businesses
INSERT INTO public.businesses (id, slug, name, description, category, timezone, deposit_cents, currency, address, phone)
VALUES
(
    '11111111-1111-1111-1111-111111111111',
    'glow-clinic',
    'Glow Aesthetic Clinic & Wellness',
    'Premier medical spa offering advanced laser treatments, skincare, and restorative wellness therapies.',
    'clinic',
    'America/New_York',
    3000, -- $30.00 deposit
    'usd',
    '450 Lexington Ave, Suite 400, New York, NY 10017',
    '+1 (212) 555-0199'
),
(
    '22222222-2222-2222-2222-222222222222',
    'urban-blade',
    'Urban Blade Barber & Grooming Lounge',
    'Modern gentleman barber studio specializing in precision haircuts, hot towel shaves, and beard craft.',
    'salon',
    'America/New_York',
    1500, -- $15.00 deposit
    'usd',
    '128 Bedford Ave, Brooklyn, NY 11249',
    '+1 (718) 555-0144'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Services for Glow Clinic
INSERT INTO public.services (id, business_id, name, description, duration_min, price_cents)
VALUES
('33333333-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'HydraFacial Deluxe', 'Deep pore cleansing, exfoliation, hydration, and LED light therapy.', 45, 17500),
('33333333-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'Microneedling Collagen Boost', 'Collagen induction therapy for skin tightening and smoothing.', 60, 25000),
('33333333-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'Laser Hair Removal - Underarms', 'Targeted diode laser therapy for permanent hair reduction.', 30, 9500),
('33333333-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111', 'Chemical Peel Glow Treatment', 'Gentle exfoliating peel for tone, clarity, and radiance.', 40, 14000)
ON CONFLICT (id) DO NOTHING;

-- Services for Urban Blade
INSERT INTO public.services (id, business_id, name, description, duration_min, price_cents)
VALUES
('33333333-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', 'Signature Fade & Scissor Cut', 'Custom precision haircut including neck shave and styling.', 35, 4500),
('33333333-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Traditional Hot Towel Shave', 'Aromatherapy steam, pre-shave oil, hot lathers, and straight razor.', 40, 5000),
('33333333-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222222', 'The Full Package (Hair + Beard)', 'Complete haircut, beard trim, shaping, razor line-up and scalp massage.', 60, 8500)
ON CONFLICT (id) DO NOTHING;

-- 3. Business Hours (Monday to Saturday 9:00 - 18:00, Sunday closed)
INSERT INTO public.business_hours (business_id, weekday, opens, closes, is_closed)
VALUES
('11111111-1111-1111-1111-111111111111', 0, '09:00', '18:00', true),
('11111111-1111-1111-1111-111111111111', 1, '09:00', '18:00', false),
('11111111-1111-1111-1111-111111111111', 2, '09:00', '18:00', false),
('11111111-1111-1111-1111-111111111111', 3, '09:00', '18:00', false),
('11111111-1111-1111-1111-111111111111', 4, '09:00', '18:00', false),
('11111111-1111-1111-1111-111111111111', 5, '09:00', '19:00', false),
('11111111-1111-1111-1111-111111111111', 6, '10:00', '17:00', false),

('22222222-2222-2222-2222-222222222222', 0, '10:00', '16:00', false),
('22222222-2222-2222-2222-222222222222', 1, '09:00', '19:00', false),
('22222222-2222-2222-2222-222222222222', 2, '09:00', '19:00', false),
('22222222-2222-2222-2222-222222222222', 3, '09:00', '19:00', false),
('22222222-2222-2222-2222-222222222222', 4, '09:00', '20:00', false),
('22222222-2222-2222-2222-222222222222', 5, '09:00', '20:00', false),
('22222222-2222-2222-2222-222222222222', 6, '09:00', '18:00', false)
ON CONFLICT (business_id, weekday) DO NOTHING;

-- 4. Sample Queue Entries
INSERT INTO public.queue_entries (id, business_id, customer_name, customer_phone, ticket_no, status, estimated_wait_min)
VALUES
('55555555-1111-1111-1111-111111111101', '11111111-1111-1111-1111-111111111111', 'Sarah Jenkins', '+1 (555) 234-5678', 'A012', 'served', 0),
('55555555-1111-1111-1111-111111111102', '11111111-1111-1111-1111-111111111111', 'David Ross', '+1 (555) 345-6789', 'A013', 'called', 0),
('55555555-1111-1111-1111-111111111103', '11111111-1111-1111-1111-111111111111', 'Emma Watson', '+1 (555) 456-7890', 'A014', 'waiting', 15),
('55555555-1111-1111-1111-111111111104', '11111111-1111-1111-1111-111111111111', 'Michael Chang', '+1 (555) 567-8901', 'A015', 'waiting', 30)
ON CONFLICT (id) DO NOTHING;
