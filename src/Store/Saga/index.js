import { call, put, takeLatest } from 'redux-saga/effects';
import {
  loginFailure,
  loginStart,
  loginSuccess,
  registerFailure,
  registerStart,
  registerSuccess,
} from '../Slices/handlers/AuthSlice';
import { login, persistAuth, register } from '../../Services/apiService';

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
      yield put(
        registerSuccess({
          message: data?.message || 'Account created successfully',
          email: action.payload?.email || data?.savedUser?.email || null,
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

export function* watcherSaga() {
  yield takeLatest(loginStart.type, loginSaga);
  yield takeLatest(registerStart.type, registerSaga);
}
