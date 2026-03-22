-- Create enum for application roles
CREATE TYPE public.app_role AS ENUM ('admin', 'operator', 'viewer');

-- Create user_roles table (separate from profiles to prevent privilege escalation)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user has any admin-level role
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- RLS policy for user_roles: only admins can view roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS policy for user_roles: only admins can manage roles
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Drop existing permissive policies on customers table
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can delete customers" ON public.customers;

-- Create role-based policies for customers (PII protection)
CREATE POLICY "Admins and operators can view customers"
ON public.customers
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid()) OR 
  public.has_role(auth.uid(), 'operator')
);

CREATE POLICY "Admins and operators can insert customers"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin(auth.uid()) OR 
  public.has_role(auth.uid(), 'operator')
);

CREATE POLICY "Admins and operators can update customers"
ON public.customers
FOR UPDATE
TO authenticated
USING (
  public.is_admin(auth.uid()) OR 
  public.has_role(auth.uid(), 'operator')
);

CREATE POLICY "Only admins can delete customers"
ON public.customers
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Drop existing permissive policies on ca_transactions table
DROP POLICY IF EXISTS "Authenticated users can view ca_transactions" ON public.ca_transactions;
DROP POLICY IF EXISTS "Authenticated users can insert ca_transactions" ON public.ca_transactions;
DROP POLICY IF EXISTS "Authenticated users can delete ca_transactions" ON public.ca_transactions;

-- Create role-based policies for ca_transactions
CREATE POLICY "Admins and operators can view transactions"
ON public.ca_transactions
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid()) OR 
  public.has_role(auth.uid(), 'operator')
);

CREATE POLICY "Admins and operators can insert transactions"
ON public.ca_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin(auth.uid()) OR 
  public.has_role(auth.uid(), 'operator')
);

CREATE POLICY "Only admins can delete transactions"
ON public.ca_transactions
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));