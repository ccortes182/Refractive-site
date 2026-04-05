-- ==========================================================================
-- Supabase Database Setup for Refractive
-- Run this in Supabase Dashboard > SQL Editor
-- ==========================================================================

-- 1. Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  job_title TEXT,
  company TEXT,
  member_state TEXT DEFAULT 'active',
  member_since TIMESTAMPTZ DEFAULT NOW(),
  last_resource TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'client', 'investor', 'admin')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tool access table (which premium tools each member has unlocked)
CREATE TABLE IF NOT EXISTS public.tool_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resource_slug TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, resource_slug)
);

-- 3. Portal access table (client/investor portal permissions)
CREATE TABLE IF NOT EXISTS public.portal_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  portal_type TEXT NOT NULL CHECK (portal_type IN ('client', 'investor')),
  granted_by UUID REFERENCES public.profiles(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  UNIQUE(user_id, portal_type)
);

-- 4. Activity log (optional — track resource access)
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resource_slug TEXT,
  portal_type TEXT,
  accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================================
-- Row Level Security (RLS)
-- ==========================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Tool access: users can read their own, insert for themselves
CREATE POLICY "Users can read own tool access"
  ON public.tool_access FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tool access"
  ON public.tool_access FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Portal access: users can read their own (admin manages via service role)
CREATE POLICY "Users can read own portal access"
  ON public.portal_access FOR SELECT
  USING (auth.uid() = user_id);

-- Activity log: users can insert their own, read their own
CREATE POLICY "Users can insert own activity"
  ON public.activity_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own activity"
  ON public.activity_log FOR SELECT
  USING (auth.uid() = user_id);

-- ==========================================================================
-- Service role bypass (for admin scripts and edge functions)
-- The service role key automatically bypasses RLS, so admin-invite.js
-- and portal-guard.js can read/write any row using the service role key.
-- ==========================================================================

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tool_access_user ON public.tool_access(user_id);
CREATE INDEX IF NOT EXISTS idx_portal_access_user ON public.portal_access(user_id);
CREATE INDEX IF NOT EXISTS idx_portal_access_type ON public.portal_access(portal_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON public.activity_log(user_id);
