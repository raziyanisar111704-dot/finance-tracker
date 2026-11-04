import { ArrowLeftRight } from 'lucide-react';
import { ComingSoon } from '../../components/ComingSoon.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';

export default function TransactionsPage() {
  useDocumentTitle('Transactions');
  return (
    <ComingSoon
      title="Transactions"
      icon={ArrowLeftRight}
      step="4.2"
      description="Add, edit, search and filter your income and expenses."
    />
  );
}
