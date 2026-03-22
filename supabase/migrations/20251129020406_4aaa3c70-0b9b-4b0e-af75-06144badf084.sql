-- Fix search_path for security definer functions
CREATE OR REPLACE FUNCTION public.generate_auth_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_code TEXT;
  last_number INTEGER;
  new_number INTEGER;
  new_code TEXT;
BEGIN
  SELECT code INTO last_code
  FROM public.authentications
  ORDER BY code DESC
  LIMIT 1;
  
  IF last_code IS NULL THEN
    new_code := '#A0001';
  ELSE
    last_number := CAST(SUBSTRING(last_code FROM 3) AS INTEGER);
    new_number := last_number + 1;
    new_code := '#A' || LPAD(new_number::TEXT, 4, '0');
  END IF;
  
  RETURN new_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;