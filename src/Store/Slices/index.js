import { combineReducers } from '@reduxjs/toolkit';
import authReducer from './handlers/AuthSlice';

const rootReducer = combineReducers({
  auth: authReducer,
});

export default rootReducer;
