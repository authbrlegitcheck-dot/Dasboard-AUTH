-- Create enum for authentication results
CREATE TYPE public.auth_result AS ENUM ('AUTH', 'RÉPLICA');

-- Create enum for item categories
CREATE TYPE public.item_category AS ENUM ('roupa', 'tenis_calcados', 'personalizado');

-- Create table for authentications
CREATE TABLE public.authentications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  requester_name TEXT NOT NULL,
  brand TEXT NOT NULL,
  item_name TEXT NOT NULL,
  result public.auth_result NOT NULL,
  item_category public.item_category NOT NULL DEFAULT 'roupa',
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for weekly goals
CREATE TABLE public.weekly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_text TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  week_start DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for monthly targets
CREATE TABLE public.monthly_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month DATE NOT NULL UNIQUE,
  target_authentications INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.authentications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_targets ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow authenticated users to read all
CREATE POLICY "Allow authenticated users to view authentications"
  ON public.authentications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert authentications"
  ON public.authentications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update authentications"
  ON public.authentications FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete authentications"
  ON public.authentications FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to view weekly goals"
  ON public.weekly_goals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to manage weekly goals"
  ON public.weekly_goals FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to view monthly targets"
  ON public.monthly_targets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to manage monthly targets"
  ON public.monthly_targets FOR ALL
  TO authenticated
  USING (true);

-- Create function to auto-generate authentication codes
CREATE OR REPLACE FUNCTION public.generate_auth_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER authentications_updated_at
  BEFORE UPDATE ON public.authentications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER weekly_goals_updated_at
  BEFORE UPDATE ON public.weekly_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER monthly_targets_updated_at
  BEFORE UPDATE ON public.monthly_targets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();