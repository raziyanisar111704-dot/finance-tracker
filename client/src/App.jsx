import { Route, Routes } from 'react-router';
import { AppShell } from './components/layout/AppShell.jsx';
import LoginPage from './features/auth/LoginPage.jsx';
import RegisterPage from './features/auth/RegisterPage.jsx';
import { GuestOnly, RequireAuth } from './features/auth/RouteGuards.jsx';
import BudgetsPage from './features/budgets/BudgetsPage.jsx';
import CategoriesPage from './features/categories/CategoriesPage.jsx';
import ForgotPasswordPage from './features/auth/ForgotPasswordPage.jsx';
import ResetPasswordPage from './features/auth/ResetPasswordPage.jsx';
import DashboardPage from './features/dashboard/DashboardPage.jsx';
import ImportPage from './features/import/ImportPage.jsx';
import NotFoundPage from './features/NotFoundPage.jsx';
import ReportsPage from './features/reports/ReportsPage.jsx';
import GuidePage from './features/guide/GuidePage.jsx';
import SettingsPage from './features/settings/SettingsPage.jsx';
import TransactionsPage from './features/transactions/TransactionsPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>
      {/* Opened from the email: works whether or not someone is logged in. */}
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/transactions/import" element={<ImportPage />} />
          <Route path="/budgets" element={<BudgetsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/guide" element={<GuidePage />} />
          <Route path="/settings/categories" element={<CategoriesPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
