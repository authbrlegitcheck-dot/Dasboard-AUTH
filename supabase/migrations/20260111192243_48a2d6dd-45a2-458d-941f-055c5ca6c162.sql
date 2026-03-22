-- Drop existing admin-only policies to recreate consistently
DROP POLICY IF EXISTS "Only admins can view customers" ON public.customers;
DROP POLICY IF EXISTS "Only admins can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Only admins can update customers" ON public.customers;
DROP POLICY IF EXISTS "Only admins can delete customers" ON public.customers;

-- Recreate customers policies
CREATE POLICY "Only admins can view customers"
ON public.customers FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can insert customers"
ON public.customers FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update customers"
ON public.customers FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete customers"
ON public.customers FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Drop and recreate partner_stores policies
DROP POLICY IF EXISTS "Only admins can view partner_stores" ON public.partner_stores;
DROP POLICY IF EXISTS "Only admins can insert partner_stores" ON public.partner_stores;
DROP POLICY IF EXISTS "Only admins can update partner_stores" ON public.partner_stores;
DROP POLICY IF EXISTS "Only admins can delete partner_stores" ON public.partner_stores;

CREATE POLICY "Only admins can view partner_stores"
ON public.partner_stores FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can insert partner_stores"
ON public.partner_stores FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update partner_stores"
ON public.partner_stores FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete partner_stores"
ON public.partner_stores FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Drop and recreate investments policies
DROP POLICY IF EXISTS "Only admins can view investments" ON public.investments;
DROP POLICY IF EXISTS "Only admins can insert investments" ON public.investments;
DROP POLICY IF EXISTS "Only admins can update investments" ON public.investments;
DROP POLICY IF EXISTS "Only admins can delete investments" ON public.investments;

CREATE POLICY "Only admins can view investments"
ON public.investments FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can insert investments"
ON public.investments FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update investments"
ON public.investments FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete investments"
ON public.investments FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));