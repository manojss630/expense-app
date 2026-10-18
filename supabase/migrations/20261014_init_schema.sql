-- ==============================================================================
-- ExpenseApp - Database Schema & Row Level Security (RLS)
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Family Groups Table
CREATE TABLE IF NOT EXISTS public.family_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Family Members Table
CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'Tag',
    color TEXT NOT NULL DEFAULT '#6366F1',
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    family_group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    receipt_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Create Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_expenses_family_group ON public.expenses(family_group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_member ON public.expenses(member_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_family_members_group ON public.family_members(family_group_id);
CREATE INDEX IF NOT EXISTS idx_categories_user ON public.categories(user_id);

-- ==============================================================================
-- Row Level Security (RLS)
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Family Groups Policies
-- Users can view groups where they are the owner or a linked member
DROP POLICY IF EXISTS "Users can view family groups" ON public.family_groups;
CREATE POLICY "Users can view family groups"
    ON public.family_groups FOR SELECT
    USING (
        owner_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.family_members fm
            WHERE fm.family_group_id = public.family_groups.id
            AND fm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create family groups" ON public.family_groups;
CREATE POLICY "Users can create family groups"
    ON public.family_groups FOR INSERT
    WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can update family groups" ON public.family_groups;
CREATE POLICY "Owners can update family groups"
    ON public.family_groups FOR UPDATE
    USING (owner_id = auth.uid());

-- Family Members Policies
DROP POLICY IF EXISTS "Users can view family members of their group" ON public.family_members;
CREATE POLICY "Users can view family members of their group"
    ON public.family_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.family_groups fg
            WHERE fg.id = public.family_members.family_group_id
            AND (
                fg.owner_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.family_members fm2
                    WHERE fm2.family_group_id = fg.id AND fm2.user_id = auth.uid()
                )
            )
        )
    );

DROP POLICY IF EXISTS "Owners or members can add family members" ON public.family_members;
CREATE POLICY "Owners or members can add family members"
    ON public.family_members FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.family_groups fg
            WHERE fg.id = family_group_id AND fg.owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Owners can update family members" ON public.family_members;
CREATE POLICY "Owners can update family members"
    ON public.family_members FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.family_groups fg
            WHERE fg.id = family_group_id AND fg.owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Owners can delete family members" ON public.family_members;
CREATE POLICY "Owners can delete family members"
    ON public.family_members FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.family_groups fg
            WHERE fg.id = family_group_id AND fg.owner_id = auth.uid()
        )
    );

-- Categories Policies
DROP POLICY IF EXISTS "Users can view default and their own categories" ON public.categories;
CREATE POLICY "Users can view default and their own categories"
    ON public.categories FOR SELECT
    USING (is_default = true OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own custom categories" ON public.categories;
CREATE POLICY "Users can insert their own custom categories"
    ON public.categories FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their custom categories" ON public.categories;
CREATE POLICY "Users can update their custom categories"
    ON public.categories FOR UPDATE
    USING (user_id = auth.uid() AND is_default = false);

DROP POLICY IF EXISTS "Users can delete their custom categories" ON public.categories;
CREATE POLICY "Users can delete their custom categories"
    ON public.categories FOR DELETE
    USING (user_id = auth.uid() AND is_default = false);

-- Expenses Policies
DROP POLICY IF EXISTS "Users can view group expenses" ON public.expenses;
CREATE POLICY "Users can view group expenses"
    ON public.expenses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.family_groups fg
            WHERE fg.id = public.expenses.family_group_id
            AND (
                fg.owner_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.family_members fm
                    WHERE fm.family_group_id = fg.id AND fm.user_id = auth.uid()
                )
            )
        )
    );

DROP POLICY IF EXISTS "Users can insert expenses into their group" ON public.expenses;
CREATE POLICY "Users can insert expenses into their group"
    ON public.expenses FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.family_groups fg
            WHERE fg.id = family_group_id
            AND (
                fg.owner_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.family_members fm
                    WHERE fm.family_group_id = fg.id AND fm.user_id = auth.uid()
                )
            )
        )
    );

DROP POLICY IF EXISTS "Users can update expenses in their group" ON public.expenses;
CREATE POLICY "Users can update expenses in their group"
    ON public.expenses FOR UPDATE
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.family_groups fg
            WHERE fg.id = family_group_id AND fg.owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete expenses in their group" ON public.expenses;
CREATE POLICY "Users can delete expenses in their group"
    ON public.expenses FOR DELETE
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.family_groups fg
            WHERE fg.id = family_group_id AND fg.owner_id = auth.uid()
        )
    );

-- ==============================================================================
-- Triggers for User Signup Lifecycle
-- ==============================================================================

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    new_group_id UUID;
    member_name TEXT;
BEGIN
    member_name := COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));

    -- 1. Insert into public.profiles
    INSERT INTO public.profiles (id, full_name, phone, avatar_url, role)
    VALUES (
        new.id,
        member_name,
        new.raw_user_meta_data->>'phone',
        new.raw_user_meta_data->>'avatar_url',
        'admin'
    );

    -- 2. Create default Family Group for user
    INSERT INTO public.family_groups (name, owner_id)
    VALUES (member_name || '''s Family', new.id)
    RETURNING id INTO new_group_id;

    -- 3. Add user as Primary Family Member (Self)
    INSERT INTO public.family_members (family_group_id, user_id, display_name)
    VALUES (new_group_id, new.id, member_name || ' (Self)');

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==============================================================================
-- Storage Buckets & Policies
-- ==============================================================================
-- Insert buckets if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Avatar storage policy
CREATE POLICY "Public avatar access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Receipt storage policy
CREATE POLICY "Public receipt access"
ON storage.objects FOR SELECT
USING (bucket_id = 'receipts');

CREATE POLICY "Authenticated users can upload receipts"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'receipts' AND
    auth.role() = 'authenticated'
);

-- ==============================================================================
-- Global Default Categories Seed
-- ==============================================================================
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

