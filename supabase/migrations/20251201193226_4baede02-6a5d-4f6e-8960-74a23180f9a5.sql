-- Create customers table for CRM
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  instagram TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create policies for customers
CREATE POLICY "Allow authenticated users to view customers" 
ON public.customers 
FOR SELECT 
USING (true);

CREATE POLICY "Allow authenticated users to insert customers" 
ON public.customers 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update customers" 
ON public.customers 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow authenticated users to delete customers" 
ON public.customers 
FOR DELETE 
USING (true);

-- Add customer_id to authentications table
ALTER TABLE public.authentications 
ADD COLUMN customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_authentications_customer_id ON public.authentications(customer_id);

-- Add trigger for updated_at on customers
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();