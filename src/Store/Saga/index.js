import { call, put, takeLatest } from 'redux-saga/effects';
import {
  createCompanyFailure,
  createCompanyStart,
  createCompanySuccess,
  loginFailure,
  loginStart,
  loginSuccess,
  registerFailure,
  registerStart,
  registerSuccess,
} from '../Slices/handlers/AuthSlice';
import {
  createCompany,
  login,
  persistAuth,
  register,
} from '../../Services/apiService';

function* loginSaga(action) {
  try {
    const data = yield call(login, action.payload);
    if (data?.success) {
      persistAuth(data.userResponse);
      yield put(loginSuccess(data.userResponse));
    } else {
      yield put(loginFailure(data?.message || 'Login failed'));
    }
  } catch (error) {
    yield put(
      loginFailure(error?.response?.data?.message || error.message || 'Login failed')
    );
  }
}

function* registerSaga(action) {
  try {
    const data = yield call(register, action.payload);
    if (data?.success) {
      persistAuth(data.savedUser);
      yield put(
        registerSuccess({
          message: data?.message || 'Account created successfully',
          email: action.payload?.email || data?.savedUser?.email || null,
          savedUser: data.savedUser,
        })
      );
    } else {
      yield put(registerFailure(data?.message || 'Registration failed'));
    }
  } catch (error) {
    yield put(
      registerFailure(
        error?.response?.data?.message || error.message || 'Registration failed'
      )
    );
  }
}

function* createCompanySaga(action) {
  try {
    const data = yield call(createCompany, action.payload);
    if (data?.success) {
      const user = data.userResponse || data.savedUser;
      persistAuth(user);
      yield put(createCompanySuccess(user));
    } else {
      yield put(createCompanyFailure(data?.message || 'Failed to create company'));
    }
  } catch (error) {
    yield put(
      createCompanyFailure(
        error?.response?.data?.message || error.message || 'Failed to create company'
      )
    );
  }
}

export function* watcherSaga() {
  yield takeLatest(loginStart.type, loginSaga);
  yield takeLatest(registerStart.type, registerSaga);
  yield takeLatest(createCompanyStart.type, createCompanySaga);
}
