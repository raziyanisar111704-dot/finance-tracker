import { Target } from 'lucide-react';
import { ComingSoon } from '../../components/ComingSoon.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';

export default function BudgetsPage() {
  useDocumentTitle('Budgets');
  return (
    <ComingSoon
      title="Budgets"
      icon={Target}
      step="4.4"
      description="Set monthly limits per category and see how much is left."
    />
  );
}
