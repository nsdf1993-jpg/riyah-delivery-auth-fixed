import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, type ReactNode } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { ToastProvider } from '@/components/toast';
import { Loading } from '@/components/ui';
import { roleHome } from '@/pages/auth-pages';
import { LoginPage, RegisterPage } from '@/pages/auth-pages';
import {
  CustomerHome, NewOrderPage, TrackOrderPage, CustomerHistoryPage, CustomerProfilePage,
} from '@/pages/customer-pages';
import {
  DriverHome, DriverOrderDetailPage, DriverHistoryPage, DriverProfilePage,
} from '@/pages/driver-pages';
import {
  AdminDashboard, AdminOrdersPage, AdminDriversPage, AdminCustomersPage, AdminSettingsPage,
} from '@/pages/admin-pages';
import type { UserRole } from '@/lib/types';

function RequireRole({ role, children }: { role: UserRole | UserRole[]; children: ReactNode }) {
  const { profile, loading } = useAuth();
  const location = useLocation();
  const roles = Array.isArray(role) ? role : [role];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <Loading label="جارٍ التحقق..." />
      </div>
    );
  }
  if (!profile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (!roles.includes(profile.role)) {
    return <Navigate to={roleHome(profile.role)} replace />;
  }
  return <>{children}</>;
}

function RoleRedirect() {
  const { profile, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loading /></div>;
  if (!profile) return <Navigate to="/login" replace />;
  return <Navigate to={roleHome(profile.role)} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RoleRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Customer */}
      <Route path="/customer" element={<RequireRole role="customer"><CustomerHome /></RequireRole>} />
      <Route path="/customer/new-order" element={<RequireRole role="customer"><NewOrderPage /></RequireRole>} />
      <Route path="/customer/track/:orderId" element={<RequireRole role="customer"><TrackOrderPageWrapper /></RequireRole>} />
      <Route path="/customer/history" element={<RequireRole role="customer"><CustomerHistoryPage /></RequireRole>} />
      <Route path="/customer/profile" element={<RequireRole role="customer"><CustomerProfilePage /></RequireRole>} />

      {/* Driver */}
      <Route path="/driver" element={<RequireRole role="driver"><DriverHome /></RequireRole>} />
      <Route path="/driver/order/:orderId" element={<RequireRole role="driver"><DriverOrderWrapper /></RequireRole>} />
      <Route path="/driver/orders" element={<RequireRole role="driver"><DriverHome /></RequireRole>} />
      <Route path="/driver/history" element={<RequireRole role="driver"><DriverHistoryPage /></RequireRole>} />
      <Route path="/driver/profile" element={<RequireRole role="driver"><DriverProfilePage /></RequireRole>} />

      {/* Admin */}
      <Route path="/admin" element={<RequireRole role="admin"><AdminDashboard /></RequireRole>} />
      <Route path="/admin/orders" element={<RequireRole role="admin"><AdminOrdersPage /></RequireRole>} />
      <Route path="/admin/drivers" element={<RequireRole role="admin"><AdminDriversPage /></RequireRole>} />
      <Route path="/admin/customers" element={<RequireRole role="admin"><AdminCustomersPage /></RequireRole>} />
      <Route path="/admin/settings" element={<RequireRole role="admin"><AdminSettingsPage /></RequireRole>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import { useParams } from 'react-router-dom';

function TrackOrderPageWrapper() {
  const { orderId } = useParams<{ orderId: string }>();
  return <TrackOrderPage orderId={orderId!} />;
}

function DriverOrderWrapper() {
  const { orderId } = useParams<{ orderId: string }>();
  return <DriverOrderDetailPage orderId={orderId!} />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
