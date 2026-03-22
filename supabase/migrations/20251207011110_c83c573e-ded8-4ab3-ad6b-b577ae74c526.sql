-- Create table for investments/expenses tracking
CREATE TABLE public.investments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated users to view investments"
ON public.investments
FOR SELECT
USING (true);

CREATE POLICY "Allow authenticated users to insert investments"
ON public.investments
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update investments"
ON public.investments
FOR UPDATE
USING (true);

CREATE POLICY "Allow authenticated users to delete investments"
ON public.investments
FOR DELETE
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_investments_updated_at
BEFORE UPDATE ON public.investments
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();