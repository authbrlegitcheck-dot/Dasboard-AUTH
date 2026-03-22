-- Drop all existing permissive policies and recreate with proper authentication checks

-- =====================
-- CUSTOMERS TABLE
-- =====================
DROP POLICY IF EXISTS "Allow authenticated users to delete customers" ON public.customers;
DROP POLICY IF EXISTS "Allow authenticated users to insert customers" ON public.customers;
DROP POLICY IF EXISTS "Allow authenticated users to update customers" ON public.customers;
DROP POLICY IF EXISTS "Allow authenticated users to view customers" ON public.customers;

CREATE POLICY "Authenticated users can view customers"
  ON public.customers FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert customers"
  ON public.customers FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update customers"
  ON public.customers FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete customers"
  ON public.customers FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- =====================
-- PARTNER_STORES TABLE
-- =====================
DROP POLICY IF EXISTS "Allow authenticated users to delete partner stores" ON public.partner_stores;
DROP POLICY IF EXISTS "Allow authenticated users to insert partner stores" ON public.partner_stores;
DROP POLICY IF EXISTS "Allow authenticated users to update partner stores" ON public.partner_stores;
DROP POLICY IF EXISTS "Allow authenticated users to view partner stores" ON public.partner_stores;

CREATE POLICY "Authenticated users can view partner stores"
  ON public.partner_stores FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert partner stores"
  ON public.partner_stores FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update partner stores"
  ON public.partner_stores FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete partner stores"
  ON public.partner_stores FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- =====================
-- AUTHENTICATIONS TABLE
-- =====================
DROP POLICY IF EXISTS "Allow authenticated users to delete authentications" ON public.authentications;
DROP POLICY IF EXISTS "Allow authenticated users to insert authentications" ON public.authentications;
DROP POLICY IF EXISTS "Allow authenticated users to update authentications" ON public.authentications;
DROP POLICY IF EXISTS "Allow authenticated users to view authentications" ON public.authentications;

CREATE POLICY "Authenticated users can view authentications"
  ON public.authentications FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert authentications"
  ON public.authentications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update authentications"
  ON public.authentications FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete authentications"
  ON public.authentications FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- =====================
-- INVESTMENTS TABLE
-- =====================
DROP POLICY IF EXISTS "Allow authenticated users to delete investments" ON public.investments;
DROP POLICY IF EXISTS "Allow authenticated users to insert investments" ON public.investments;
DROP POLICY IF EXISTS "Allow authenticated users to update investments" ON public.investments;
DROP POLICY IF EXISTS "Allow authenticated users to view investments" ON public.investments;

CREATE POLICY "Authenticated users can view investments"
  ON public.investments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert investments"
  ON public.investments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update investments"
  ON public.investments FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete investments"
  ON public.investments FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- =====================
-- CA_PACKAGES TABLE
-- =====================
DROP POLICY IF EXISTS "Allow authenticated users to delete ca_packages" ON public.ca_packages;
DROP POLICY IF EXISTS "Allow authenticated users to insert ca_packages" ON public.ca_packages;
DROP POLICY IF EXISTS "Allow authenticated users to update ca_packages" ON public.ca_packages;
DROP POLICY IF EXISTS "Allow authenticated users to view ca_packages" ON public.ca_packages;

CREATE POLICY "Authenticated users can view ca_packages"
  ON public.ca_packages FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert ca_packages"
  ON public.ca_packages FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update ca_packages"
  ON public.ca_packages FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete ca_packages"
  ON public.ca_packages FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- =====================
-- CA_PURCHASES TABLE
-- =====================
DROP POLICY IF EXISTS "Allow authenticated users to delete ca_purchases" ON public.ca_purchases;
DROP POLICY IF EXISTS "Allow authenticated users to insert ca_purchases" ON public.ca_purchases;
DROP POLICY IF EXISTS "Allow authenticated users to update ca_purchases" ON public.ca_purchases;
DROP POLICY IF EXISTS "Allow authenticated users to view ca_purchases" ON public.ca_purchases;

CREATE POLICY "Authenticated users can view ca_purchases"
  ON public.ca_purchases FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert ca_purchases"
  ON public.ca_purchases FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update ca_purchases"
  ON public.ca_purchases FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete ca_purchases"
  ON public.ca_purchases FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- =====================
-- CA_TRANSACTIONS TABLE
-- =====================
DROP POLICY IF EXISTS "Allow authenticated users to delete ca_transactions" ON public.ca_transactions;
DROP POLICY IF EXISTS "Allow authenticated users to insert ca_transactions" ON public.ca_transactions;
DROP POLICY IF EXISTS "Allow authenticated users to view ca_transactions" ON public.ca_transactions;

CREATE POLICY "Authenticated users can view ca_transactions"
  ON public.ca_transactions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert ca_transactions"
  ON public.ca_transactions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete ca_transactions"
  ON public.ca_transactions FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- =====================
-- PARTNER_CREDITS_HISTORY TABLE
-- =====================
DROP POLICY IF EXISTS "Allow authenticated users to delete credits history" ON public.partner_credits_history;
DROP POLICY IF EXISTS "Allow authenticated users to insert credits history" ON public.partner_credits_history;
DROP POLICY IF EXISTS "Allow authenticated users to view credits history" ON public.partner_credits_history;

CREATE POLICY "Authenticated users can view partner credits history"
  ON public.partner_credits_history FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert partner credits history"
  ON public.partner_credits_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete partner credits history"
  ON public.partner_credits_history FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- =====================
-- WEEKLY_GOALS TABLE
-- =====================
DROP POLICY IF EXISTS "Allow authenticated users to manage weekly goals" ON public.weekly_goals;
DROP POLICY IF EXISTS "Allow authenticated users to view weekly goals" ON public.weekly_goals;

CREATE POLICY "Authenticated users can manage weekly goals"
  ON public.weekly_goals FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- =====================
-- MONTHLY_TARGETS TABLE
-- =====================
DROP POLICY IF EXISTS "Allow authenticated users to manage monthly targets" ON public.monthly_targets;
DROP POLICY IF EXISTS "Allow authenticated users to view monthly targets" ON public.monthly_targets;

CREATE POLICY "Authenticated users can manage monthly targets"
  ON public.monthly_targets FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);