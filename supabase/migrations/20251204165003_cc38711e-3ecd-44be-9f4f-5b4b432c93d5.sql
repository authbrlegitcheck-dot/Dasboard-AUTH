-- Create partner stores table
CREATE TABLE public.partner_stores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  code_prefix text NOT NULL UNIQUE,
  contact_name text,
  contact_email text,
  contact_phone text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.partner_stores ENABLE ROW LEVEL SECURITY;

-- RLS policies for partner_stores
CREATE POLICY "Allow authenticated users to view partner stores"
ON public.partner_stores FOR SELECT
USING (true);

CREATE POLICY "Allow authenticated users to insert partner stores"
ON public.partner_stores FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update partner stores"
ON public.partner_stores FOR UPDATE
USING (true);

CREATE POLICY "Allow authenticated users to delete partner stores"
ON public.partner_stores FOR DELETE
USING (true);

-- Add partner_store_id to authentications table
ALTER TABLE public.authentications
ADD COLUMN partner_store_id uuid REFERENCES public.partner_stores(id) ON DELETE SET NULL;

-- Create function to generate partner-specific auth codes
CREATE OR REPLACE FUNCTION public.generate_partner_auth_code(p_partner_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  store_prefix TEXT;
  last_code TEXT;
  last_number INTEGER;
  new_number INTEGER;
  new_code TEXT;
BEGIN
  -- Get the store prefix
  SELECT code_prefix INTO store_prefix
  FROM public.partner_stores
  WHERE id = p_partner_id;
  
  IF store_prefix IS NULL THEN
    RAISE EXCEPTION 'Partner store not found';
  END IF;
  
  -- Get last code for this partner
  SELECT code INTO last_code
  FROM public.authentications
  WHERE partner_store_id = p_partner_id
  ORDER BY code DESC
  LIMIT 1;
  
  IF last_code IS NULL THEN
    new_code := '#' || store_prefix || '-0001';
  ELSE
    last_number := CAST(SUBSTRING(last_code FROM LENGTH(store_prefix) + 3) AS INTEGER);
    new_number := last_number + 1;
    new_code := '#' || store_prefix || '-' || LPAD(new_number::TEXT, 4, '0');
  END IF;
  
  RETURN new_code;
END;
$function$;

-- Trigger to update updated_at
CREATE TRIGGER update_partner_stores_updated_at
BEFORE UPDATE ON public.partner_stores
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();