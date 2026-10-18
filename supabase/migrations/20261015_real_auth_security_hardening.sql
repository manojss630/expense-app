-- ==============================================================================
-- ExpenseApp - Real Authentication & Security Hardening Migration
-- Proposed Migration: 20261015_real_auth_security_hardening.sql
-- ==============================================================================
-- 1. Hardens the signup trigger public.handle_new_user()
--    - Defaults user role to 'member' instead of 'admin'
--    - Uses ON CONFLICT and existence checks to ensure idempotency
--    - Reuses existing family_group and self-member if already present
-- 2. Ensures default global categories exist (with NULL user_id and is_default=true)
-- 3. Keeps all RLS policies intact without modifying foreign keys
-- ==============================================================================

-- Function: idempotent user signup lifecycle handler
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    new_group_id UUID;
    member_name TEXT;
    assigned_role TEXT;
BEGIN
    member_name := COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
    -- Strictly assign 'member'; never trust raw_user_meta_data for elevated privileges
    assigned_role := 'member';

    -- 1. Insert or update public.profiles (role = 'member' by default)
    INSERT INTO public.profiles (id, full_name, phone, avatar_url, role)
    VALUES (
        new.id,
        member_name,
        new.raw_user_meta_data->>'phone',
        new.raw_user_meta_data->>'avatar_url',
        assigned_role
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url);

    -- 2. Create or find default Family Group for user
    SELECT id INTO new_group_id
    FROM public.family_groups
    WHERE owner_id = new.id
    LIMIT 1;

    IF new_group_id IS NULL THEN
        INSERT INTO public.family_groups (name, owner_id)
        VALUES (member_name || '''s Family', new.id)
        RETURNING id INTO new_group_id;
    END IF;

    -- 3. Add user as Primary Family Member (Self) if not already present
    IF NOT EXISTS (
        SELECT 1 FROM public.family_members
        WHERE family_group_id = new_group_id AND user_id = new.id
    ) THEN
        INSERT INTO public.family_members (family_group_id, user_id, display_name)
        VALUES (new_group_id, new.id, member_name || ' (Self)');
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Ensure all standard default categories exist globally
INSERT INTO public.categories (name, icon, color, is_default, user_id)
VALUES
    ('Petrol', 'Fuel', '#EF4444', true, NULL),
    ('Medical', 'Activity', '#EC4899', true, NULL),
    ('Motor', 'Settings', '#F97316', true, NULL),
    ('Wire/Electrical', 'Zap', '#F59E0B', true, NULL),
    ('Food', 'Utensils', '#10B981', true, NULL),
    ('Travel', 'Plane', '#3B82F6', true, NULL),
    ('Shopping', 'ShoppingBag', '#8B5CF6', true, NULL),
    ('Education', 'BookOpen', '#06B6D4', true, NULL),
    ('Other', 'MoreHorizontal', '#6B7280', true, NULL)
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- Non-Destructive Backfill for Existing Users Missing Related Records
-- (Only creates missing profiles, family groups, or self-members)
-- ==============================================================================

-- 1. Backfill missing profiles for existing auth.users
INSERT INTO public.profiles (id, full_name, role)
SELECT
    u.id,
    COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
    'member'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 2. Backfill missing family groups for existing profiles without an owned family group
INSERT INTO public.family_groups (name, owner_id)
SELECT
    p.full_name || '''s Family',
    p.id
FROM public.profiles p
LEFT JOIN public.family_groups fg ON fg.owner_id = p.id
WHERE fg.id IS NULL;

-- 3. Backfill missing self-member records in the owned family group
INSERT INTO public.family_members (family_group_id, user_id, display_name)
SELECT
    fg.id,
    fg.owner_id,
    p.full_name || ' (Self)'
FROM public.family_groups fg
JOIN public.profiles p ON p.id = fg.owner_id
LEFT JOIN public.family_members fm ON fm.family_group_id = fg.id AND fm.user_id = fg.owner_id
WHERE fm.id IS NULL;


