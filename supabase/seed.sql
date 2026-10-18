-- ==============================================================================
-- ExpenseApp - Repeatable Seed Script (Ramesh & Brother Suresh Example)
-- ==============================================================================
-- IMPORTANT:
-- This seed script requires an existing Supabase Auth user.
-- Set the test email below to match your registered test user in Supabase Auth.
-- ==============================================================================

DO $$
DECLARE
    -- 1. Configurable test user email
    target_email TEXT := 'ramesh@example.com';

    -- Variables to hold resolved entities
    target_user_id UUID;
    found_email TEXT;
    user_meta JSONB;
    user_display_name TEXT;
    target_family_id UUID;
    self_member_id UUID;
    brother_member_id UUID;

    -- Category IDs
    cat_petrol_id UUID;
    cat_medical_id UUID;
    cat_motor_id UUID;
    cat_wire_id UUID;
    cat_food_id UUID;

    -- Stable Expense IDs (Deterministic UUIDs per user so repeated runs are idempotent)
    exp_petrol_id UUID;
    exp_medical_id UUID;
    exp_motor_id UUID;
    exp_wire_id UUID;
    exp_food_id UUID;
BEGIN
    -- -------------------------------------------------------------------------
    -- Step 1: Look up the real Supabase Auth user
    -- -------------------------------------------------------------------------
    SELECT id, email, raw_user_meta_data
    INTO target_user_id, found_email, user_meta
    FROM auth.users
    WHERE lower(email) = lower(trim(target_email))
    LIMIT 1;

    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'Seed aborted: User with email "%" does not exist in auth.users. Please create or sign up this user first in Supabase Auth (e.g. via Authentication -> Users in dashboard, or via web signup) before running this seed script.', target_email;
    END IF;

    user_display_name := COALESCE(user_meta->>'full_name', split_part(found_email, '@', 1));

    -- -------------------------------------------------------------------------
    -- Step 2: Ensure profile exists (respecting signup trigger, default 'member' role)
    -- -------------------------------------------------------------------------
    INSERT INTO public.profiles (id, full_name, phone, avatar_url, role)
    VALUES (
        target_user_id,
        user_display_name,
        user_meta->>'phone',
        user_meta->>'avatar_url',
        'member'
    )
    ON CONFLICT (id) DO NOTHING;

    -- -------------------------------------------------------------------------
    -- Step 3: Reuse or create Family Group for user
    -- -------------------------------------------------------------------------
    -- Look for a family group owned by the user first
    SELECT id INTO target_family_id
    FROM public.family_groups
    WHERE owner_id = target_user_id
    ORDER BY created_at ASC
    LIMIT 1;

    -- If not found, check if the user is linked in an existing group
    IF target_family_id IS NULL THEN
        SELECT family_group_id INTO target_family_id
        FROM public.family_members
        WHERE user_id = target_user_id
        ORDER BY created_at ASC
        LIMIT 1;
    END IF;

    -- If still missing, create a new family group
    IF target_family_id IS NULL THEN
        INSERT INTO public.family_groups (name, owner_id)
        VALUES (user_display_name || '''s Family', target_user_id)
        RETURNING id INTO target_family_id;
    END IF;

    -- -------------------------------------------------------------------------
    -- Step 4: Reuse or create Primary Self Member
    -- -------------------------------------------------------------------------
    SELECT id INTO self_member_id
    FROM public.family_members
    WHERE family_group_id = target_family_id
      AND user_id = target_user_id
    LIMIT 1;

    IF self_member_id IS NULL THEN
        INSERT INTO public.family_members (family_group_id, user_id, display_name)
        VALUES (target_family_id, target_user_id, user_display_name || ' (Self)')
        RETURNING id INTO self_member_id;
    END IF;

    -- -------------------------------------------------------------------------
    -- Step 5: Add Brother (Suresh) only if missing in this family
    -- -------------------------------------------------------------------------
    SELECT id INTO brother_member_id
    FROM public.family_members
    WHERE family_group_id = target_family_id
      AND display_name = 'Brother (Suresh)'
    LIMIT 1;

    IF brother_member_id IS NULL THEN
        INSERT INTO public.family_members (family_group_id, user_id, display_name)
        VALUES (target_family_id, NULL, 'Brother (Suresh)')
        RETURNING id INTO brother_member_id;
    END IF;

    -- -------------------------------------------------------------------------
    -- Step 6: Resolve Categories (user-owned or shared default, never another user's)
    -- -------------------------------------------------------------------------
    -- Petrol
    SELECT id INTO cat_petrol_id FROM public.categories
    WHERE lower(name) = lower('Petrol')
      AND (is_default = true OR user_id = target_user_id)
    ORDER BY (CASE WHEN user_id = target_user_id THEN 0 ELSE 1 END), created_at ASC LIMIT 1;

    IF cat_petrol_id IS NULL THEN
        INSERT INTO public.categories (name, icon, color, is_default, user_id)
        VALUES ('Petrol', 'Fuel', '#EF4444', true, NULL)
        RETURNING id INTO cat_petrol_id;
    END IF;

    -- Medical
    SELECT id INTO cat_medical_id FROM public.categories
    WHERE lower(name) = lower('Medical')
      AND (is_default = true OR user_id = target_user_id)
    ORDER BY (CASE WHEN user_id = target_user_id THEN 0 ELSE 1 END), created_at ASC LIMIT 1;

    IF cat_medical_id IS NULL THEN
        INSERT INTO public.categories (name, icon, color, is_default, user_id)
        VALUES ('Medical', 'Activity', '#EC4899', true, NULL)
        RETURNING id INTO cat_medical_id;
    END IF;

    -- Motor
    SELECT id INTO cat_motor_id FROM public.categories
    WHERE lower(name) = lower('Motor')
      AND (is_default = true OR user_id = target_user_id)
    ORDER BY (CASE WHEN user_id = target_user_id THEN 0 ELSE 1 END), created_at ASC LIMIT 1;

    IF cat_motor_id IS NULL THEN
        INSERT INTO public.categories (name, icon, color, is_default, user_id)
        VALUES ('Motor', 'Settings', '#F97316', true, NULL)
        RETURNING id INTO cat_motor_id;
    END IF;

    -- Wire/Electrical
    SELECT id INTO cat_wire_id FROM public.categories
    WHERE lower(name) = lower('Wire/Electrical')
      AND (is_default = true OR user_id = target_user_id)
    ORDER BY (CASE WHEN user_id = target_user_id THEN 0 ELSE 1 END), created_at ASC LIMIT 1;

    IF cat_wire_id IS NULL THEN
        INSERT INTO public.categories (name, icon, color, is_default, user_id)
        VALUES ('Wire/Electrical', 'Zap', '#F59E0B', true, NULL)
        RETURNING id INTO cat_wire_id;
    END IF;

    -- Food
    SELECT id INTO cat_food_id FROM public.categories
    WHERE lower(name) = lower('Food')
      AND (is_default = true OR user_id = target_user_id)
    ORDER BY (CASE WHEN user_id = target_user_id THEN 0 ELSE 1 END), created_at ASC LIMIT 1;

    IF cat_food_id IS NULL THEN
        INSERT INTO public.categories (name, icon, color, is_default, user_id)
        VALUES ('Food', 'Utensils', '#10B981', true, NULL)
        RETURNING id INTO cat_food_id;
    END IF;

    -- -------------------------------------------------------------------------
    -- Step 7: Generate Deterministic Stable Expense IDs (Repeatable & Idempotent)
    -- -------------------------------------------------------------------------
    exp_petrol_id  := md5(target_user_id::text || ':expense:brother:petrol')::uuid;
    exp_medical_id := md5(target_user_id::text || ':expense:brother:medical')::uuid;
    exp_motor_id   := md5(target_user_id::text || ':expense:brother:motor')::uuid;
    exp_wire_id    := md5(target_user_id::text || ':expense:brother:wire')::uuid;
    exp_food_id    := md5(target_user_id::text || ':expense:self:food')::uuid;

    -- -------------------------------------------------------------------------
    -- Step 8: Insert / Upsert Sample Expenses
    -- Brother: Petrol 1200, Medical 130, Motor 90, Wire/Electrical 120 (Total: 1540)
    -- Ramesh: Food 450
    -- -------------------------------------------------------------------------
    INSERT INTO public.expenses (
        id, user_id, family_group_id, member_id, category_id, amount, expense_date, note
    )
    VALUES
        (exp_petrol_id,  target_user_id, target_family_id, brother_member_id, cat_petrol_id,  1200.00, CURRENT_DATE, 'Bike petrol refill at Indian Oil'),
        (exp_medical_id, target_user_id, target_family_id, brother_member_id, cat_medical_id,  130.00, CURRENT_DATE, 'Pharmacy cough syrup & tablets'),
        (exp_motor_id,   target_user_id, target_family_id, brother_member_id, cat_motor_id,     90.00, CURRENT_DATE, 'Motor spare clamp & lubricant'),
        (exp_wire_id,    target_user_id, target_family_id, brother_member_id, cat_wire_id,     120.00, CURRENT_DATE, 'Electric wire roll & plug socket'),
        (exp_food_id,    target_user_id, target_family_id, self_member_id,    cat_food_id,     450.00, CURRENT_DATE, 'Family dinner groceries')
    ON CONFLICT (id) DO UPDATE SET
        user_id         = EXCLUDED.user_id,
        family_group_id = EXCLUDED.family_group_id,
        member_id       = EXCLUDED.member_id,
        category_id     = EXCLUDED.category_id,
        amount          = EXCLUDED.amount,
        expense_date    = EXCLUDED.expense_date,
        note            = EXCLUDED.note;

    RAISE NOTICE 'Seed completed successfully for % (User ID: %). Brother expenses total: 1540.00. Self food expense: 450.00.',
        target_email, target_user_id;
END $$;

-- ==============================================================================
-- Read-Only Verification Queries
-- ==============================================================================

-- Query 1: Verify Family Group, Owner, and Members
SELECT
    fg.id AS family_group_id,
    fg.name AS family_group_name,
    p.full_name AS owner_name,
    u.email AS owner_email,
    fm.id AS member_id,
    fm.display_name AS member_name,
    fm.user_id AS linked_user_id
FROM public.family_groups fg
JOIN public.profiles p ON p.id = fg.owner_id
JOIN auth.users u ON u.id = p.id
JOIN public.family_members fm ON fm.family_group_id = fg.id
WHERE lower(u.email) = lower('ramesh@example.com')
ORDER BY fm.display_name;

-- Query 2: Verify Brother (Suresh) itemized expenses and total (1540.00)
SELECT
    fm.display_name AS person,
    c.name AS category,
    e.amount,
    e.expense_date,
    e.note
FROM public.expenses e
JOIN public.family_members fm ON fm.id = e.member_id
JOIN public.categories c ON c.id = e.category_id
JOIN auth.users u ON u.id = e.user_id
WHERE lower(u.email) = lower('ramesh@example.com')
  AND fm.display_name = 'Brother (Suresh)'
ORDER BY e.amount DESC;

-- Query 3: Verify member summary totals
SELECT
    fm.display_name AS person,
    COUNT(e.id) AS total_transactions,
    SUM(e.amount) AS total_amount
FROM public.expenses e
JOIN public.family_members fm ON fm.id = e.member_id
JOIN auth.users u ON u.id = e.user_id
WHERE lower(u.email) = lower('ramesh@example.com')
GROUP BY fm.display_name
ORDER BY total_amount DESC;
