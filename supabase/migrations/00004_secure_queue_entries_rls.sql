-- ==============================================================================
-- QUEUELINE MIGRATION 00004: Secure Queue Entries RLS & Public Summary Functions
-- Closes customer PII vulnerability (customer_name, customer_phone leakage)
-- Hardened with SECURITY DEFINER and SET search_path = public
-- ==============================================================================

-- 1. Drop insecure policies
DROP POLICY IF EXISTS "Anyone can view business active queue" ON public.queue_entries;
DROP POLICY IF EXISTS "Customers can join queue" ON public.queue_entries;
DROP POLICY IF EXISTS "Staff and owners can manage queue entries" ON public.queue_entries;

-- 2. Restrict SELECT to ticket owner (matching auth.uid()) or authorized business staff/owners
CREATE POLICY "Customers can view own queue ticket" ON public.queue_entries
    FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Staff and owners can view business queue" ON public.queue_entries
    FOR SELECT USING (public.has_role(business_id, ARRAY['owner', 'staff']));

-- 3. Require customer_id = auth.uid() on INSERT for walk-in and authenticated customers
CREATE POLICY "Customers can join queue with auth uid" ON public.queue_entries
    FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- 4. Staff and owners can manage queue entries for their business
CREATE POLICY "Staff and owners can manage queue entries" ON public.queue_entries
    FOR ALL
    USING (public.has_role(business_id, ARRAY['owner', 'staff']))
    WITH CHECK (public.has_role(business_id, ARRAY['owner', 'staff']));

-- 5. Safe Public RPC: Return people waiting and current serving ticket without leaking customer PII
CREATE OR REPLACE FUNCTION public.get_queue_public_status(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_waiting_count INT;
  v_serving_ticket TEXT;
BEGIN
  SELECT COUNT(*)::INT INTO v_waiting_count
  FROM public.queue_entries
  WHERE business_id = p_business_id AND status = 'waiting';

  SELECT ticket_no INTO v_serving_ticket
  FROM public.queue_entries
  WHERE business_id = p_business_id AND status = 'called'
  ORDER BY updated_at DESC
  LIMIT 1;

  IF v_serving_ticket IS NULL THEN
    SELECT ticket_no INTO v_serving_ticket
    FROM public.queue_entries
    WHERE business_id = p_business_id AND status = 'waiting'
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'waiting_count', COALESCE(v_waiting_count, 0),
    'serving_ticket_no', v_serving_ticket
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_queue_public_status(UUID) TO anon, authenticated, service_role;

-- 6. Safe Public RPC: Return ticket position and queue progress for a ticket holder without leaking other customers' PII
CREATE OR REPLACE FUNCTION public.get_queue_position(p_ticket_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target public.queue_entries%ROWTYPE;
  v_people_ahead INT;
  v_serving_ticket TEXT;
BEGIN
  SELECT * INTO v_target
  FROM public.queue_entries
  WHERE id = p_ticket_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(*)::INT INTO v_people_ahead
  FROM public.queue_entries
  WHERE business_id = v_target.business_id
    AND status = 'waiting'
    AND created_at < v_target.created_at;

  SELECT ticket_no INTO v_serving_ticket
  FROM public.queue_entries
  WHERE business_id = v_target.business_id AND status = 'called'
  ORDER BY updated_at DESC
  LIMIT 1;

  IF v_serving_ticket IS NULL THEN
    SELECT ticket_no INTO v_serving_ticket
    FROM public.queue_entries
    WHERE business_id = v_target.business_id AND status = 'waiting'
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'people_ahead', COALESCE(v_people_ahead, 0),
    'serving_ticket_no', v_serving_ticket,
    'status', v_target.status,
    'ticket_no', v_target.ticket_no,
    'estimated_wait_min', v_target.estimated_wait_min
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_queue_position(UUID) TO anon, authenticated, service_role;
