import {
  Bolt,
  Briefcase,
  Car,
  Film,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Laptop,
  Percent,
  PiggyBank,
  ShoppingBag,
  ShoppingBasket,
  Tag,
  TrendingUp,
  Utensils,
} from 'lucide-react';

// Icon names stored on categories (server/src/services/defaultCategories.js).
// Only these are imported, so the app doesn't ship all 1,600+ icons.
const ICONS = {
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
  tag: Tag,
  briefcase: Briefcase,
  laptop: Laptop,
  percent: Percent,
  gift: Gift,
};

export function CategoryIcon({ category, className = 'size-10' }) {
  const Icon = ICONS[category?.icon] ?? Tag;
  const color = category?.color ?? '#64748b';
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl ${className}`}
      // 1f = 12% opacity background in the category's own colour.
      style={{ backgroundColor: `${color}1f`, color }}
      aria-hidden="true"
    >
      <Icon className="size-5" />
    </span>
  );
}
