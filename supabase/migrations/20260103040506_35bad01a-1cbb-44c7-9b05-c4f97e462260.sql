-- Add a column to track if authentication was paid with CA credits
ALTER TABLE public.authentications 
ADD COLUMN paid_with_ca boolean NOT NULL DEFAULT false;