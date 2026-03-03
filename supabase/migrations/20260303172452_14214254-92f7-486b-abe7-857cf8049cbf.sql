
-- Drop the overly permissive policy
DROP POLICY "Service role can manage all subscriptions" ON public.subscriptions;

-- Recreate it restricted to service_role only
CREATE POLICY "Service role can manage all subscriptions"
ON public.subscriptions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
