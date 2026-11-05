import { Route, Routes } from 'react-router';
import { AppShell } from './components/layout/AppShell.jsx';
import LoginPage from './features/auth/LoginPage.jsx';
import RegisterPage from './features/auth/RegisterPage.jsx';
import { GuestOnly, RequireAuth } from './features/auth/RouteGuards.jsx';
import BudgetsPage from './features/budgets/BudgetsPage.jsx';
import CategoriesPage from './features/categories/CategoriesPage.jsx';
import DashboardPage from './features/dashboard/DashboardPage.jsx';
import NotFoundPage from './features/NotFoundPage.jsx';
import ReportsPage from './features/reports/ReportsPage.jsx';
import SettingsPage from './features/settings/SettingsPage.jsx';
import TransactionsPage from './features/transactions/TransactionsPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/budgets" element={<BudgetsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/categories" element={<CategoriesPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
