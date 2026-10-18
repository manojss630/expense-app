'use client';

import React, { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  Fuel,
  HeartPulse,
  Wrench,
  Zap,
  Utensils,
  Plane,
  ShoppingBag,
  GraduationCap,
  MoreHorizontal,
  Car,
  Home,
  Coffee,
  Tv,
  Check,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { Category } from '@expense-app/shared';

const iconOptions = [
  { name: 'Tag', icon: Tag },
  { name: 'Fuel', icon: Fuel },
  { name: 'HeartPulse', icon: HeartPulse },
  { name: 'Wrench', icon: Wrench },
  { name: 'Zap', icon: Zap },
  { name: 'Utensils', icon: Utensils },
  { name: 'Plane', icon: Plane },
  { name: 'ShoppingBag', icon: ShoppingBag },
  { name: 'GraduationCap', icon: GraduationCap },
  { name: 'Car', icon: Car },
  { name: 'Home', icon: Home },
  { name: 'Coffee', icon: Coffee },
  { name: 'Tv', icon: Tv },
  { name: 'MoreHorizontal', icon: MoreHorizontal },
];

const colorOptions = [
  '#EF4444', // Red
  '#EC4899', // Pink
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#64748B', // Slate
];

const iconMap: Record<string, React.ElementType> = Object.fromEntries(
  iconOptions.map((item) => [item.name, item.icon])
);
iconMap['Activity'] = HeartPulse;
iconMap['Settings'] = Wrench;
iconMap['BookOpen'] = GraduationCap;

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Category Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Tag');
  const [selectedColor, setSelectedColor] = useState('#6366F1');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await api.getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter category name');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await api.createCategory({
        name: name.trim(),
        icon: selectedIcon,
        color: selectedColor,
      });
      setName('');
      setIsModalOpen(false);
      await loadCategories();
    } catch (err: any) {
      setError(err.message || 'Failed to create category');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Expense Categories
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Default preset categories and your custom categories with custom icons and colors
          </p>
        </div>

        <Button
          size="md"
          onClick={() => {
            setError(null);
            setIsModalOpen(true);
          }}
          className="shadow-md shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Create Category
        </Button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories.map((cat) => {
          const IconComp = iconMap[cat.icon] || Tag;

          return (
            <Card key={cat.id} className="hover:border-indigo-300 dark:hover:border-indigo-700 transition">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                    style={{ backgroundColor: cat.color }}
                  >
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      {cat.name}
                    </h2>
                    <span className="text-[11px] text-slate-400">
                      {cat.is_default ? 'System Default' : 'Custom Category'}
                    </span>
                  </div>
                </div>

                <Badge variant={cat.is_default ? 'default' : 'purple'}>
                  {cat.is_default ? 'Default' : 'Custom'}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create Category Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Custom Category"
        description="Choose a unique name, icon, and color for your new category"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Category Name
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Gym & Fitness, House Maintenance, Gifts"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Icon Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Choose Icon
            </label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
              {iconOptions.map((opt) => {
                const IconComponent = opt.icon;
                const isSelected = selectedIcon === opt.name;
                return (
                  <button
                    type="button"
                    key={opt.name}
                    onClick={() => setSelectedIcon(opt.name)}
                    className={`p-2.5 rounded-xl border transition ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 ring-2 ring-indigo-500'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <IconComponent className="w-5 h-5" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Choose Color Theme
            </label>
            <div className="flex flex-wrap gap-2.5">
              {colorOptions.map((c) => {
                const isSelected = selectedColor === c;
                return (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setSelectedColor(c)}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition ring-offset-2 hover:scale-110"
                    style={{
                      backgroundColor: c,
                      outline: isSelected ? `2px solid ${c}` : 'none',
                    }}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={submitting}>
              Create Category
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

