
-- Fix overly permissive INSERT policy on notifications
DROP POLICY "System can insert notifications" ON public.notifications;

-- Allow authenticated users to receive notifications (inserted by edge functions or admin)
CREATE POLICY "Authenticated users can receive notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
