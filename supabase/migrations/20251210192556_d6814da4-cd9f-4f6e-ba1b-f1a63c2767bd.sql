-- Add credits column to partner_stores table
ALTER TABLE public.partner_stores 
ADD COLUMN credits numeric NOT NULL DEFAULT 0;

-- Create credits_history table to track credit transactions
CREATE TABLE public.partner_credits_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_store_id uuid NOT NULL REFERENCES public.partner_stores(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.partner_credits_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to view credits history"
ON public.partner_credits_history
FOR SELECT
USING (true);

CREATE POLICY "Allow authenticated users to insert credits history"
ON public.partner_credits_history
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete credits history"
ON public.partner_credits_history
FOR DELETE
USING (true);