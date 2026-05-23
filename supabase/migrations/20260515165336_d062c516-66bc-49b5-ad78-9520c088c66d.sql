CREATE POLICY "users read own events"
ON public.engagement_events
FOR SELECT
TO authenticated
USING (user_id = auth.uid());