import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
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

const Routers = () => {
  const token = getItem('token');

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Navigate
              to={token ? RoutePathName.DASHBOARD : RoutePathName.AUTH}
              replace
            />
          }
        />
        <Route path={RoutePathName.AUTH} element={<Auth />} />
        <Route element={<ProtectedRoutes />}>
          <Route path={RoutePathName.DASHBOARD} element={<Dashboard />} />
          <Route path={RoutePathName.FOOD_ITEMS} element={<FoodItems />} />
          <Route path={RoutePathName.BILLING} element={<Billing />} />
          <Route path={RoutePathName.ORDERS} element={<Orders />} />
          <Route path={RoutePathName.EXPENSES} element={<Expenses />} />
          <Route path={RoutePathName.REPORTS} element={<Reports />} />
          <Route path={RoutePathName.COMPANY_PROFILE} element={<CompanyProfile />} />
          <Route
            path={RoutePathName.MY_PROFILE}
            element={<Navigate to={RoutePathName.DASHBOARD} replace />}
          />
          <Route
            path={RoutePathName.HOME}
            element={<Navigate to={RoutePathName.DASHBOARD} replace />}
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default Routers;
