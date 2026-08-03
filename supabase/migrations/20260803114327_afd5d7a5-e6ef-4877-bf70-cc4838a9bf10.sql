-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'viewer');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "roles readable by authenticated" ON public.user_roles FOR SELECT TO authenticated USING (true);

-- New user bootstrap: profile + role (first user is admin)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  existing_count int;
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email,''), '@', 1)))
  ON CONFLICT (id) DO NOTHING;

  SELECT count(*) INTO existing_count FROM public.user_roles;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN existing_count = 0 THEN 'admin'::public.app_role ELSE 'viewer'::public.app_role END)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Shared PTS state document (single source of truth)
CREATE TABLE public.pts_state (
  id TEXT PRIMARY KEY DEFAULT 'global',
  version BIGINT NOT NULL DEFAULT 0,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  scoring_device TEXT,
  scoring_user UUID,
  scoring_heartbeat TIMESTAMPTZ,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pts_state TO authenticated;
GRANT INSERT, UPDATE ON public.pts_state TO authenticated;
GRANT ALL ON public.pts_state TO service_role;
ALTER TABLE public.pts_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pts_state readable by authenticated" ON public.pts_state
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins insert pts_state" ON public.pts_state
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update pts_state" ON public.pts_state
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER pts_state_updated_at BEFORE UPDATE ON public.pts_state
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Atomic, version-guarded state write
CREATE OR REPLACE FUNCTION public.pts_push_state(
  _expected_version bigint,
  _data jsonb,
  _device text
) RETURNS public.pts_state
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  row public.pts_state;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  UPDATE public.pts_state s
     SET data = _data,
         version = s.version + 1,
         updated_by = auth.uid(),
         scoring_device = COALESCE(_device, s.scoring_device),
         scoring_user = CASE WHEN _device IS NULL THEN s.scoring_user ELSE auth.uid() END,
         scoring_heartbeat = CASE WHEN _device IS NULL THEN s.scoring_heartbeat ELSE now() END
   WHERE s.id = 'global'
     AND (_expected_version < 0 OR s.version = _expected_version)
  RETURNING * INTO row;

  IF row.id IS NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.pts_state WHERE id = 'global') THEN
      INSERT INTO public.pts_state (id, data, version, updated_by, scoring_device, scoring_user, scoring_heartbeat)
      VALUES ('global', _data, 1, auth.uid(), _device, auth.uid(), now())
      RETURNING * INTO row;
    ELSE
      RAISE EXCEPTION 'version_conflict';
    END IF;
  END IF;

  RETURN row;
END;
$$;

-- Claim / release the active scoring lock
CREATE OR REPLACE FUNCTION public.pts_claim_scoring(_device text, _force boolean DEFAULT false)
RETURNS public.pts_state
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  row public.pts_state;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  INSERT INTO public.pts_state (id) VALUES ('global') ON CONFLICT (id) DO NOTHING;

  UPDATE public.pts_state s
     SET scoring_device = _device,
         scoring_user = auth.uid(),
         scoring_heartbeat = now()
   WHERE s.id = 'global'
     AND (_force
          OR s.scoring_device IS NULL
          OR s.scoring_device = _device
          OR s.scoring_heartbeat IS NULL
          OR s.scoring_heartbeat < now() - interval '90 seconds')
  RETURNING * INTO row;

  IF row.id IS NULL THEN
    RAISE EXCEPTION 'locked_elsewhere';
  END IF;
  RETURN row;
END;
$$;

CREATE OR REPLACE FUNCTION public.pts_release_scoring(_device text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.pts_state
     SET scoring_device = NULL, scoring_user = NULL, scoring_heartbeat = NULL
   WHERE id = 'global' AND scoring_device = _device;
END;
$$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.pts_state;
ALTER TABLE public.pts_state REPLICA IDENTITY FULL;