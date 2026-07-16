import { axiosApi } from './axiosInstance';
import { removeItem, setItem } from './localService';

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const URL = {
  LOGIN: `${BACKEND_URL}/auth/login`,
  REGISTER: `${BACKEND_URL}/auth/register`,
  UPDATE_PROFILE: `${BACKEND_URL}/auth/profile`,
  COMPANY: `${BACKEND_URL}/company`,
  FOOD_ITEMS: `${BACKEND_URL}/food-items`,
  BILLS: `${BACKEND_URL}/bills`,
};

export const login = async (payload) => {
  const response = await axiosApi('skip').post('/auth/login', payload);
  return response.data;
};

export const register = async (payload) => {
  const response = await axiosApi('skip').post('/auth/register', payload);
  return response.data;
};

export const updateProfile = async (payload, file) => {
  const formData = new FormData();
  formData.append('fullName', payload.fullName);
  formData.append('email', payload.email);
  formData.append('phone', payload.phone);
  if (file) {
    formData.append('profileImage', file);
  }

  const response = await axiosApi('multipart').put('/auth/profile', formData);
  return response.data;
};

export const getCompany = async () => {
  const response = await axiosApi().get('/company');
  return response.data;
};

export const saveCompany = async (payload, file) => {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });
  if (file) {
    formData.append('companyLogo', file);
  }

  const response = await axiosApi('multipart').put('/company', formData);
  return response.data;
};

export const getFoodItems = async () => {
  const response = await axiosApi().get('/food-items');
  return response.data;
};

export const createFoodItem = async (payload) => {
  const response = await axiosApi().post('/food-items', payload);
  return response.data;
};

export const updateFoodItem = async (id, payload) => {
  const response = await axiosApi().put(`/food-items/${id}`, payload);
  return response.data;
};

export const deleteFoodItem = async (id) => {
  const response = await axiosApi().delete(`/food-items/${id}`);
  return response.data;
};

export const getBills = async () => {
  const response = await axiosApi().get('/bills');
  return response.data;
};

export const getDashboard = async () => {
  const response = await axiosApi().get('/bills/dashboard');
  return response.data;
};

export const getReports = async (params = {}) => {
  const response = await axiosApi().get('/bills/reports', { params });
  return response.data;
};

export const getNextBillInfo = async () => {
  const response = await axiosApi().get('/bills/next');
  return response.data;
};

export const createBill = async (payload) => {
  const response = await axiosApi().post('/bills', payload);
  return response.data;
};

export const getBillById = async (id) => {
  const response = await axiosApi().get(`/bills/${id}`);
  return response.data;
};

export const getOrders = async (params = {}) => {
  const response = await axiosApi().get('/orders', { params });
  return response.data;
};

export const getOrderById = async (id) => {
  const response = await axiosApi().get(`/orders/${id}`);
  return response.data;
};

export const createOrder = async (payload) => {
  const response = await axiosApi().post('/orders', payload);
  return response.data;
};

export const updateOrder = async (id, payload) => {
  const response = await axiosApi().put(`/orders/${id}`, payload);
  return response.data;
};

export const generateBillFromOrder = async (id) => {
  const response = await axiosApi().post(`/orders/${id}/generate-bill`);
  return response.data;
};

export const cancelOrder = async (id) => {
  const response = await axiosApi().post(`/orders/${id}/cancel`);
  return response.data;
};

export const getExpenses = async (params = {}) => {
  const response = await axiosApi().get('/expenses', { params });
  return response.data;
};

export const createExpense = async (payload) => {
  const response = await axiosApi().post('/expenses', payload);
  return response.data;
};

export const updateExpense = async (id, payload) => {
  const response = await axiosApi().put(`/expenses/${id}`, payload);
  return response.data;
};

export const deleteExpense = async (id) => {
  const response = await axiosApi().delete(`/expenses/${id}`);
  return response.data;
};

export const createCompany = async (payload) => {
  const response = await axiosApi().post('/company/create', payload);
  return response.data;
};

export const logout = async () => {
  removeItem('token');
  removeItem('user');
  removeItem('company');
  removeItem('access_url');
  window.location.href = '/auth';
};

export const persistAuth = (user) => {
  if (user?.accessToken) {
    setItem('token', user.accessToken);
  }
  setItem('user', user);
  if (user?.company?._id) {
    setItem('company', user.company._id);
  }
  if (user?.company?.access_url) {
    setItem('access_url', user.company.access_url);
  }
};
