import {
  Baby,
  Bolt,
  Briefcase,
  Bus,
  Car,
  Coffee,
  Dumbbell,
  Film,
  Fuel,
  Gift,
  GraduationCap,
  HandCoins,
  HeartPulse,
  House,
  Landmark,
  Laptop,
  PawPrint,
  Percent,
  PiggyBank,
  Pill,
  Plane,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Tag,
  TrendingUp,
  Utensils,
  Wallet,
  Wifi,
  Wrench,
} from 'lucide-react';

// Icon names stored on categories (defaults: server/src/services/defaultCategories.js).
// Only these are imported, so the app doesn't ship all 1,600+ icons.
const ICONS = {
  tag: Tag,
  'shopping-basket': ShoppingBasket,
  home: House,
  bolt: Bolt,
  car: Car,
  'heart-pulse': HeartPulse,
  'shopping-bag': ShoppingBag,
  'graduation-cap': GraduationCap,
  film: Film,
  utensils: Utensils,
  'trending-up': TrendingUp,
  'piggy-bank': PiggyBank,
  briefcase: Briefcase,
  laptop: Laptop,
  percent: Percent,
  gift: Gift,
  bus: Bus,
  fuel: Fuel,
  plane: Plane,
  smartphone: Smartphone,
  wifi: Wifi,
  coffee: Coffee,
  shirt: Shirt,
  pill: Pill,
  dumbbell: Dumbbell,
  baby: Baby,
  'paw-print': PawPrint,
  wrench: Wrench,
  wallet: Wallet,
  landmark: Landmark,
  'hand-coins': HandCoins,
};

export const ICON_NAMES = Object.keys(ICONS);

// Colours offered when creating or editing a category (the defaults use these).
export const CATEGORY_COLORS = [
  '#16a34a',
  '#059669',
  '#0d9488',
  '#0891b2',
  '#0369a1',
  '#2563eb',
  '#7c3aed',
  '#9333ea',
  '#db2777',
  '#dc2626',
  '#ea580c',
  '#d97706',
  '#64748b',
];

export function CategoryGlyph({ name, className = 'size-5' }) {
  const Icon = ICONS[name] ?? Tag;
  return <Icon className={className} aria-hidden="true" />;
}

export function CategoryIcon({ category, className = 'size-10' }) {
  const color = category?.color ?? '#64748b';
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl ${className}`}
      // 1f = 12% opacity background in the category's own colour.
      style={{ backgroundColor: `${color}1f`, color }}
      aria-hidden="true"
    >
      <CategoryGlyph name={category?.icon} />
    </span>
  );
}
