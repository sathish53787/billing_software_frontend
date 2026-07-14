import axios from 'axios';
import { BACKEND_URL, logout } from './apiService';
import { getItem } from './localService';

export const headers = (flag = '') => {
  if (flag === 'skip') return {};
  if (flag === 'multipart') {
    return {
      Authorization: `Bearer ${getItem('token')}`,
    };
  }
  return {
    Authorization: `Bearer ${getItem('token')}`,
    'Content-Type': 'application/json',
  };
};

export const axiosApi = (flag = '') => {
  const instance = axios.create({
    baseURL: BACKEND_URL,
    headers: headers(flag),
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const status = error?.response?.status;
      if (status === 401) {
        await logout();
      }
      return Promise.reject(error);
    }
  );

  return instance;
};
