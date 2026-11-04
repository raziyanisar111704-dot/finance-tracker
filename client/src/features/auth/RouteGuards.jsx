import { Navigate, Outlet, useLocation } from 'react-router';
import { FullPageStatus } from '../../components/FullPageStatus.jsx';
import { useMe } from './useAuth.js';

// Pages inside the app: only for logged-in users. Others go to /login, which
// remembers the page they wanted and returns there after logging in.
export function RequireAuth() {
  const { data: user, isPending, error, refetch } = useMe();
  const location = useLocation();

  if (isPending) return <FullPageStatus />;
  if (error) return <FullPageStatus error={error} onRetry={refetch} />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

// Login / register pages: logged-in users are sent into the app instead.
export function GuestOnly() {
  const { data: user, isPending, error, refetch } = useMe();
  const location = useLocation();

  if (isPending) return <FullPageStatus />;
  if (error) return <FullPageStatus error={error} onRetry={refetch} />;
  if (user) return <Navigate to={location.state?.from?.pathname ?? '/'} replace />;
  return <Outlet />;
}
