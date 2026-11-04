import { ChartColumn } from 'lucide-react';
import { ComingSoon } from '../../components/ComingSoon.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';

export default function ReportsPage() {
  useDocumentTitle('Reports');
  return (
    <ComingSoon
      title="Reports"
      icon={ChartColumn}
      step="4.4"
      description="Monthly, yearly and custom-range reports, plus CSV export."
    />
  );
}
