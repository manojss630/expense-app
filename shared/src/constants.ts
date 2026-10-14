export interface CategoryDefinition {
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
}

export const DEFAULT_CATEGORIES: CategoryDefinition[] = [
  { name: 'Petrol', icon: 'Fuel', color: '#EF4444', isDefault: true },
  { name: 'Medical', icon: 'HeartPulse', color: '#EC4899', isDefault: true },
  { name: 'Motor', icon: 'Wrench', color: '#F97316', isDefault: true },
  { name: 'Wire/Electrical', icon: 'Zap', color: '#F59E0B', isDefault: true },
  { name: 'Food', icon: 'Utensils', color: '#10B981', isDefault: true },
  { name: 'Travel', icon: 'Plane', color: '#3B82F6', isDefault: true },
  { name: 'Shopping', icon: 'ShoppingBag', color: '#8B5CF6', isDefault: true },
  { name: 'Education', icon: 'GraduationCap', color: '#06B6D4', isDefault: true },
  { name: 'Other', icon: 'MoreHorizontal', color: '#6B7280', isDefault: true },
];

export const APP_CONFIG = {
  APP_NAME: 'ExpenseApp',
  CURRENCY_SYMBOL: '₹',
  CURRENCY_CODE: 'INR',
  DEFAULT_PAGE_SIZE: 50,
};
