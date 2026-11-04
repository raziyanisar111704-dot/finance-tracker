import { LayoutDashboard } from 'lucide-react';
import { ComingSoon } from '../../components/ComingSoon.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';

export default function DashboardPage() {
  useDocumentTitle('Dashboard');
  return (
    <ComingSoon
      title="Dashboard"
      icon={LayoutDashboard}
      step="4.3"
      description="Monthly income, spending, savings rate, category breakdown and charts will appear here."
    />
  );
}
