import { getItem, removeItem } from '../Services/localService';
import { RoutePathName } from '../routes/RoutePathName';

export const getAccessUrl = (user = getItem('user')) => {
  const fromUser =
    user?.company?.access_url ||
    user?.access_url ||
    getItem('access_url');
  return String(fromUser || '')
    .trim()
    .toLowerCase();
};

export const getTenantPath = (path = '') => {
  const accessUrl = getAccessUrl();
  const clean = String(path || '').replace(/^\//, '');
  if (!accessUrl) return RoutePathName.AUTH;
  return clean ? `/${accessUrl}/${clean}` : `/${accessUrl}/dashboard`;
};

export const getDashboardPath = (user) => {
  const accessUrl = getAccessUrl(user);
  return accessUrl ? `/${accessUrl}/dashboard` : RoutePathName.AUTH;
};

export const clearAuthStorage = () => {
  removeItem('token');
  removeItem('user');
  removeItem('company');
  removeItem('access_url');
};
