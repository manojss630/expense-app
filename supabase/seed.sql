-- ==============================================================================
-- ExpenseApp - Seed Data (Ramesh Example Use Case)
-- ==============================================================================

DO $$
DECLARE
    ramesh_user_id UUID := '00000000-0000-0000-0000-000000000001';
    family_id UUID := '11111111-1111-1111-1111-111111111111';
    ramesh_member_id UUID := '22222222-2222-2222-2222-222222222221';
    brother_member_id UUID := '22222222-2222-2222-2222-222222222222';
    cat_petrol_id UUID;
    cat_medical_id UUID;
    cat_motor_id UUID;
    cat_wire_id UUID;
    cat_food_id UUID;
BEGIN
    -- 1. Insert Profile for Ramesh if not exists
    INSERT INTO public.profiles (id, full_name, phone, role)
    VALUES (
        ramesh_user_id,
        'Ramesh Kumar',
        '+91 9876543210',
        'admin'
    ) ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

    -- 2. Insert Family Group
    INSERT INTO public.family_groups (id, name, owner_id)
    VALUES (
        family_id,
        'Ramesh & Family',
        ramesh_user_id
    ) ON CONFLICT (id) DO NOTHING;

    -- 3. Insert Family Members: Ramesh (Self) and Brother
    INSERT INTO public.family_members (id, family_group_id, user_id, display_name)
    VALUES
        (ramesh_member_id, family_id, ramesh_user_id, 'Ramesh (Self)'),
        (brother_member_id, family_id, NULL, 'Brother (Suresh)')
    ON CONFLICT (id) DO NOTHING;

    -- 4. Get Category IDs
    SELECT id INTO cat_petrol_id FROM public.categories WHERE name = 'Petrol' LIMIT 1;
    SELECT id INTO cat_medical_id FROM public.categories WHERE name = 'Medical' LIMIT 1;
    SELECT id INTO cat_motor_id FROM public.categories WHERE name = 'Motor' LIMIT 1;
    SELECT id INTO cat_wire_id FROM public.categories WHERE name = 'Wire/Electrical' LIMIT 1;
    SELECT id INTO cat_food_id FROM public.categories WHERE name = 'Food' LIMIT 1;

    -- 5. Insert Sample Expenses for Brother (Total ₹1540):
    -- Petrol: ₹1200
    -- Medical: ₹130
    -- Motor: ₹90
    -- Wire/Electrical: ₹120
    INSERT INTO public.expenses (user_id, family_group_id, member_id, category_id, amount, expense_date, note)
    VALUES
        (ramesh_user_id, family_id, brother_member_id, cat_petrol_id, 1200.00, CURRENT_DATE, 'Bike petrol refill at Indian Oil'),
        (ramesh_user_id, family_id, brother_member_id, cat_medical_id, 130.00, CURRENT_DATE, 'Pharmacy cough syrup & tablets'),
        (ramesh_user_id, family_id, brother_member_id, cat_motor_id, 90.00, CURRENT_DATE, 'Motor spare clamp & lubricant'),
        (ramesh_user_id, family_id, brother_member_id, cat_wire_id, 120.00, CURRENT_DATE, 'Electric wire roll & plug socket'),
        -- Ramesh's own expense for comparison
        (ramesh_user_id, family_id, ramesh_member_id, cat_food_id, 450.00, CURRENT_DATE, 'Family dinner groceries')
    ON CONFLICT DO NOTHING;

END $$;
