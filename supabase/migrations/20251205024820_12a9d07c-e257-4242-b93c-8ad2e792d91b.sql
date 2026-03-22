-- Fix generate_auth_code function to only consider standard AUTH codes (starting with #A followed by digits)
CREATE OR REPLACE FUNCTION public.generate_auth_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  last_code TEXT;
  last_number INTEGER;
  new_number INTEGER;
  new_code TEXT;
BEGIN
  -- Only get codes that start with #A followed by digits (standard AUTH codes)
  SELECT code INTO last_code
  FROM public.authentications
  WHERE code ~ '^#A[0-9]+$'
  ORDER BY CAST(SUBSTRING(code FROM 3) AS INTEGER) DESC
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
$function$;