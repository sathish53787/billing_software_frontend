import { Navigate, Outlet } from 'react-router-dom';
import { getItem } from '../Services/localService';
import { RoutePathName } from './RoutePathName';

const ProtectedRoutes = () => {
  const token = getItem('token');
  return token ? <Outlet /> : <Navigate to={RoutePathName.AUTH} replace />;
};

export default ProtectedRoutes;
