import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  loading: false,
  error: null,
  user: null,
  message: null,
  registeredEmail: null,
  needsCompanySetup: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    loginSuccess: (state, action) => {
      state.loading = false;
      state.user = action.payload;
      state.message = action.payload?.message || 'Logged in successfully';
      state.needsCompanySetup = !(action.payload?.is_company || action.payload?.company);
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    registerStart: (state) => {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    registerSuccess: (state, action) => {
      state.loading = false;
      state.user = action.payload?.savedUser || null;
      state.message = action.payload?.message || 'Account created successfully';
      state.registeredEmail = action.payload?.email || null;
      state.needsCompanySetup = true;
    },
    registerFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    createCompanyStart: (state) => {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    createCompanySuccess: (state, action) => {
      state.loading = false;
      state.user = action.payload;
      state.needsCompanySetup = false;
      state.message = 'Company created successfully';
    },
    createCompanyFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    resetAuthState: () => initialState,
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  registerStart,
  registerSuccess,
  registerFailure,
  createCompanyStart,
  createCompanySuccess,
  createCompanyFailure,
  resetAuthState,
} = authSlice.actions;

export default authSlice.reducer;
