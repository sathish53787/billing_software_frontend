import { BrowserRouter, Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom';
import Auth from '../pages/Auth';
import Billing from '../pages/Billing';
import Dashboard from '../pages/Dashboard';
import Expenses from '../pages/Expenses';
import FoodItems from '../pages/FoodItems';
import Orders from '../pages/Orders';
import CompanyProfile from '../pages/Profile/CompanyProfile';
import Reports from '../pages/Reports';
import ProtectedRoutes from './protectedRoutes';
import { RoutePathName } from './RoutePathName';
import { getItem } from '../Services/localService';
import { getAccessUrl, getDashboardPath } from '../Utils/tenant';

const TenantRedirect = () => {
  const token = getItem('token');
  if (!token) return <Navigate to={RoutePathName.AUTH} replace />;
  const user = getItem('user');
  if (!user?.is_company && !user?.company) {
    return <Navigate to={RoutePathName.AUTH} replace />;
  }
  return <Navigate to={getDashboardPath(user)} replace />;
};

const AccessUrlLayout = () => {
  const { accessUrl } = useParams();
  const expected = getAccessUrl();
  if (!expected) {
    return <Navigate to={RoutePathName.AUTH} replace />;
  }
  if (String(accessUrl || '').toLowerCase() !== expected) {
    return <Navigate to={getDashboardPath()} replace />;
  }
  return <Outlet />;
};

const Routers = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<TenantRedirect />} />
      <Route path={RoutePathName.AUTH} element={<Auth />} />
      <Route element={<ProtectedRoutes />}>
        <Route path=":accessUrl" element={<AccessUrlLayout />}>
          <Route index element={<Navigate to={RoutePathName.DASHBOARD} replace />} />
          <Route path={RoutePathName.DASHBOARD} element={<Dashboard />} />
          <Route path={RoutePathName.FOOD_ITEMS} element={<FoodItems />} />
          <Route path={RoutePathName.BILLING} element={<Billing />} />
          <Route path={RoutePathName.ORDERS} element={<Orders />} />
          <Route path={RoutePathName.EXPENSES} element={<Expenses />} />
          <Route path={RoutePathName.REPORTS} element={<Reports />} />
          <Route path={RoutePathName.COMPANY_PROFILE} element={<CompanyProfile />} />
          <Route
            path={RoutePathName.MY_PROFILE}
            element={<Navigate to={`../${RoutePathName.DASHBOARD}`} replace />}
          />
          <Route
            path={RoutePathName.HOME}
            element={<Navigate to={`../${RoutePathName.DASHBOARD}`} replace />}
          />
        </Route>
      </Route>
      <Route path="*" element={<TenantRedirect />} />
    </Routes>
  </BrowserRouter>
);

export default Routers;
