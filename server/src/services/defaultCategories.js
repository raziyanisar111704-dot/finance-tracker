// Categories every new account starts with. Users can rename, archive or add more.
const DEFAULT_CATEGORIES = [
  { type: 'expense', name: 'Groceries', color: '#16a34a', icon: 'shopping-basket' },
  { type: 'expense', name: 'Rent & Housing', color: '#7c3aed', icon: 'home' },
  { type: 'expense', name: 'Utilities', color: '#0891b2', icon: 'bolt' },
  { type: 'expense', name: 'Transportation', color: '#ea580c', icon: 'car' },
  { type: 'expense', name: 'Healthcare', color: '#dc2626', icon: 'heart-pulse' },
  { type: 'expense', name: 'Shopping', color: '#db2777', icon: 'shopping-bag' },
  { type: 'expense', name: 'Education', color: '#2563eb', icon: 'graduation-cap' },
  { type: 'expense', name: 'Entertainment', color: '#9333ea', icon: 'film' },
  { type: 'expense', name: 'Dining', color: '#d97706', icon: 'utensils' },
  { type: 'expense', name: 'Investments', color: '#0d9488', icon: 'trending-up', isSavings: true },
  { type: 'expense', name: 'Savings', color: '#059669', icon: 'piggy-bank', isSavings: true },
  { type: 'expense', name: 'Other', color: '#64748b', icon: 'tag' },
  { type: 'income', name: 'Salary', color: '#15803d', icon: 'briefcase' },
  { type: 'income', name: 'Freelance', color: '#0369a1', icon: 'laptop' },
  { type: 'income', name: 'Interest', color: '#0f766e', icon: 'percent' },
  { type: 'income', name: 'Gifts', color: '#be185d', icon: 'gift' },
  { type: 'income', name: 'Other Income', color: '#64748b', icon: 'tag' },
];

export function defaultCategoriesFor(userId) {
  return DEFAULT_CATEGORIES.map((category) => ({ ...category, userId }));
}
