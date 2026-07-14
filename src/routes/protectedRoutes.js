import { Navigate, Outlet } from 'react-router-dom';
import { getItem } from '../Services/localService';

const ProtectedRoutes = () => {
  const token = getItem('token');
  return token ? <Outlet /> : <Navigate to="/auth" replace />;
};

export default ProtectedRoutes;
