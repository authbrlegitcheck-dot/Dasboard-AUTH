
-- Create CA packages table (package definitions)
CREATE TABLE public.ca_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  credits INTEGER NOT NULL,
  price NUMERIC NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add CA balance column to customers
ALTER TABLE public.customers ADD COLUMN ca_balance INTEGER NOT NULL DEFAULT 0;

-- Create CA purchases table (package purchases with expiration)
CREATE TABLE public.ca_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.ca_packages(id),
  credits_purchased INTEGER NOT NULL,
  credits_remaining INTEGER NOT NULL,
  price_paid NUMERIC NOT NULL,
  purchase_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'consumed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create CA transactions table (all movements)
CREATE TABLE public.ca_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  purchase_id UUID REFERENCES public.ca_purchases(id),
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit', 'expiration')),
  credits INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ca_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ca_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ca_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for ca_packages
CREATE POLICY "Allow authenticated users to view ca_packages" 
ON public.ca_packages FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert ca_packages" 
ON public.ca_packages FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update ca_packages" 
ON public.ca_packages FOR UPDATE USING (true);

CREATE POLICY "Allow authenticated users to delete ca_packages" 
ON public.ca_packages FOR DELETE USING (true);

-- RLS policies for ca_purchases
CREATE POLICY "Allow authenticated users to view ca_purchases" 
ON public.ca_purchases FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert ca_purchases" 
ON public.ca_purchases FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update ca_purchases" 
ON public.ca_purchases FOR UPDATE USING (true);

CREATE POLICY "Allow authenticated users to delete ca_purchases" 
ON public.ca_purchases FOR DELETE USING (true);

-- RLS policies for ca_transactions
CREATE POLICY "Allow authenticated users to view ca_transactions" 
ON public.ca_transactions FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert ca_transactions" 
ON public.ca_transactions FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete ca_transactions" 
ON public.ca_transactions FOR DELETE USING (true);

-- Insert default packages
INSERT INTO public.ca_packages (name, credits, price) VALUES
('Pacote 5 CA', 5, 0),
('Pacote 10 CA', 10, 0),
('Pacote 15 CA', 15, 0),
('Pacote 25 CA', 25, 0);
