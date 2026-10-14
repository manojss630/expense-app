import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  full_name: z.string().min(2, 'Name must be at least 2 characters long'),
  phone: z.string().optional().or(z.literal('')),
  avatar_url: z.string().url().optional().or(z.literal('')),
});

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters long').optional(),
  phone: z.string().optional().or(z.literal('')),
  avatar_url: z.string().url().optional().or(z.literal('')),
});

export const changePasswordSchema = z.object({
  new_password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export const createFamilyMemberSchema = z.object({
  display_name: z.string().min(2, 'Name must be at least 2 characters long'),
  user_id: z.string().uuid().optional().nullable(),
});

export const createCategorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters long'),
  icon: z.string().min(1, 'Icon identifier is required'),
  color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Color must be a valid hex code'),
});

export const createExpenseSchema = z.object({
  member_id: z.string().uuid('Please select a valid member'),
  category_id: z.string().uuid('Please select a valid category'),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'),
  note: z.string().max(500, 'Note cannot exceed 500 characters').optional().nullable(),
  receipt_url: z.string().url().optional().nullable().or(z.literal('')),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const expenseFilterSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  memberId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
});

export const reportFilterSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  memberId: z.string().uuid().optional(),
});

export const pdfReportRequestSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  memberId: z.string().uuid().optional(),
  title: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateFamilyMemberInput = z.infer<typeof createFamilyMemberSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ExpenseFilterInput = z.input<typeof expenseFilterSchema>;
export type ReportFilterInput = z.infer<typeof reportFilterSchema>;
export type PdfReportRequestInput = z.infer<typeof pdfReportRequestSchema>;
