GRANT SELECT ON public.pts_state TO anon;

CREATE POLICY "pts_state public read"
ON public.pts_state FOR SELECT TO anon
USING (true);

CREATE OR REPLACE FUNCTION public.pts_grant_self_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  em text;
BEGIN
  SELECT email INTO em FROM auth.users WHERE id = auth.uid();
  IF em IS NULL OR lower(em) <> 'pillitucker030421@pts.local' THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pts_grant_self_admin() TO authenticated;