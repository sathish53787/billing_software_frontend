import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import {
  loginStart,
  registerStart,
  resetAuthState,
} from '../../Store/Slices/handlers/AuthSlice';
import { RoutePathName } from '../../routes/RoutePathName';
import billingHero from '../../assets/images/auth/billing-hero.png';
import billingSignupHero from '../../assets/images/auth/billing-signup-hero.png';
import './Auth.css';

const initialSignUp = {
  fullName: '',
  phone: '',
  email: '',
  password: '',
  confirmPassword: '',
};

const initialSignIn = {
  loginId: '',
  password: '',
};

const Auth = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const auth = useSelector((state) => state.auth);

  const [isSignUp, setIsSignUp] = useState(false);
  const [signUpForm, setSignUpForm] = useState(initialSignUp);
  const [signInForm, setSignInForm] = useState(initialSignIn);
  const [signUpErrors, setSignUpErrors] = useState({});
  const [signInErrors, setSignInErrors] = useState({});
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState(false);
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  useEffect(() => {
    dispatch(resetAuthState());
  }, [dispatch]);

  useEffect(() => {
    if (auth.error) {
      toast.error(auth.error);
    }
  }, [auth.error]);

  useEffect(() => {
    if (auth.message && !auth.user) {
      toast.success(auth.message);
      setIsSignUp(false);
      setSignUpErrors({});
      setSignInErrors({});
      setSignUpForm(initialSignUp);
      setShowSignUpPassword(false);
      setShowSignUpConfirmPassword(false);
      setSignInForm({
        loginId: auth.registeredEmail || '',
        password: '',
      });
      dispatch(resetAuthState());
    }
  }, [auth.message, auth.user, auth.registeredEmail, dispatch]);

  useEffect(() => {
    if (auth.user?.accessToken) {
      toast.success('Logged in successfully');
      navigate(RoutePathName.DASHBOARD, { replace: true });
    }
  }, [auth.user, navigate]);

  const onSignUpChange = (e) => {
    const { name, value } = e.target;
    const nextForm = { ...signUpForm, [name]: value };
    setSignUpForm(nextForm);

    if (name === 'password' || name === 'confirmPassword') {
      const password = name === 'password' ? value : nextForm.password;
      const confirmPassword = name === 'confirmPassword' ? value : nextForm.confirmPassword;

      if (confirmPassword && password !== confirmPassword) {
        setSignUpErrors((prev) => ({
          ...prev,
          confirmPassword: 'Password and confirm password do not match',
        }));
      } else {
        setSignUpErrors((prev) => ({
          ...prev,
          password: name === 'password' ? '' : prev.password,
          confirmPassword: '',
        }));
      }
      return;
    }

    setSignUpErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const onSignInChange = (e) => {
    const { name, value } = e.target;
    setSignInForm((prev) => ({ ...prev, [name]: value }));
    setSignInErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateSignUp = () => {
    const errors = {};
    if (!signUpForm.fullName.trim()) errors.fullName = 'Full name is required';
    if (!signUpForm.phone.trim()) errors.phone = 'Phone number is required';
    else if (!/^(\+\d{1,3}[- ]?)?\d{10}$/.test(signUpForm.phone.replace(/\s/g, ''))) {
      errors.phone = 'Enter a valid 10-digit phone number';
    }
    if (!signUpForm.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signUpForm.email)) {
      errors.email = 'Enter a valid email';
    }
    if (!signUpForm.password) errors.password = 'Password is required';
    else if (signUpForm.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    if (!signUpForm.confirmPassword) {
      errors.confirmPassword = 'Confirm password is required';
    } else if (signUpForm.password !== signUpForm.confirmPassword) {
      errors.confirmPassword = 'Password and confirm password do not match';
    }
    setSignUpErrors(errors);

    if (errors.confirmPassword === 'Password and confirm password do not match') {
      toast.error('Password does not match');
    }

    return Object.keys(errors).length === 0;
  };

  const validateSignIn = () => {
    const errors = {};
    const loginId = signInForm.loginId.trim();
    if (!loginId) {
      errors.loginId = 'Email or phone number is required';
    } else if (loginId.includes('@')) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginId)) {
        errors.loginId = 'Enter a valid email';
      }
    } else if (!/^(\+\d{1,3}[- ]?)?\d{10}$/.test(loginId.replace(/\s/g, ''))) {
      errors.loginId = 'Enter a valid 10-digit phone number';
    }
    if (!signInForm.password) errors.password = 'Password is required';
    setSignInErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignUp = (e) => {
    e.preventDefault();
    if (!validateSignUp()) return;
    dispatch(
      registerStart({
        fullName: signUpForm.fullName.trim(),
        phone: signUpForm.phone.trim(),
        email: signUpForm.email.trim().toLowerCase(),
        password: signUpForm.password,
        confirmPassword: signUpForm.confirmPassword,
      })
    );
  };

  const handleSignIn = (e) => {
    e.preventDefault();
    if (!validateSignIn()) return;
    const loginId = signInForm.loginId.trim();
    dispatch(
      loginStart({
        loginId: loginId.includes('@') ? loginId.toLowerCase() : loginId.replace(/\s/g, ''),
        password: signInForm.password,
      })
    );
  };

  const switchPanel = (showSignUp) => {
    setIsSignUp(showSignUp);
    setSignUpErrors({});
    setSignInErrors({});
    setSignUpForm(initialSignUp);
    setSignInForm(initialSignIn);
    setShowSignUpPassword(false);
    setShowSignUpConfirmPassword(false);
    setShowSignInPassword(false);
    dispatch(resetAuthState());
  };

  return (
    <div className="auth-page">
      <div className={`auth-container ${isSignUp ? 'right-panel-active' : ''}`}>
        <div className="auth-form-container auth-sign-up">
          <form onSubmit={handleSignUp} noValidate>
            <p className="auth-brand">STV Billing Software</p>
            <h2 className="auth-action-title">Create Account</h2>
            <span>Use your email for registration</span>
            <input
              type="text"
              name="fullName"
              placeholder="Full Name"
              value={signUpForm.fullName}
              onChange={onSignUpChange}
            />
            {signUpErrors.fullName && <p className="field-error">{signUpErrors.fullName}</p>}
            <input
              type="tel"
              name="phone"
              placeholder="Phone Number"
              value={signUpForm.phone}
              onChange={onSignUpChange}
            />
            {signUpErrors.phone && <p className="field-error">{signUpErrors.phone}</p>}
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={signUpForm.email}
              onChange={onSignUpChange}
            />
            {signUpErrors.email && <p className="field-error">{signUpErrors.email}</p>}
            <div className="auth-password-field">
              <input
                type={showSignUpPassword ? 'text' : 'password'}
                name="password"
                placeholder="Password"
                value={signUpForm.password}
                onChange={onSignUpChange}
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowSignUpPassword((prev) => !prev)}
                aria-label={showSignUpPassword ? 'Hide password' : 'Show password'}
              >
                {showSignUpPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {signUpErrors.password && <p className="field-error">{signUpErrors.password}</p>}
            <div className="auth-password-field">
              <input
                type={showSignUpConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                placeholder="Confirm Password"
                value={signUpForm.confirmPassword}
                onChange={onSignUpChange}
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowSignUpConfirmPassword((prev) => !prev)}
                aria-label={
                  showSignUpConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
                }
              >
                {showSignUpConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {signUpErrors.confirmPassword && (
              <p className="field-error">{signUpErrors.confirmPassword}</p>
            )}
            <button type="submit" className="auth-btn" disabled={auth.loading}>
              {auth.loading && isSignUp ? 'Please wait...' : 'SIGN UP'}
            </button>
          </form>
        </div>

        <div className="auth-form-container auth-sign-in">
          <form onSubmit={handleSignIn} noValidate>
            <p className="auth-brand">STV Billing Software</p>
            <h2 className="auth-action-title">Sign In</h2>
            <span>Use your email or phone number</span>
            <input
              type="text"
              name="loginId"
              placeholder="Email or Phone Number"
              value={signInForm.loginId}
              onChange={onSignInChange}
              autoComplete="username"
            />
            {signInErrors.loginId && <p className="field-error">{signInErrors.loginId}</p>}
            <div className="auth-password-field">
              <input
                type={showSignInPassword ? 'text' : 'password'}
                name="password"
                placeholder="Password"
                value={signInForm.password}
                onChange={onSignInChange}
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowSignInPassword((prev) => !prev)}
                aria-label={showSignInPassword ? 'Hide password' : 'Show password'}
              >
                {showSignInPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {signInErrors.password && <p className="field-error">{signInErrors.password}</p>}
            <a href="#forgot" className="forgot-link" onClick={(e) => e.preventDefault()}>
              Forgot Your Password?
            </a>
            <button type="submit" className="auth-btn" disabled={auth.loading}>
              {auth.loading && !isSignUp ? 'Please wait...' : 'SIGN IN'}
            </button>
          </form>
        </div>

        <div className="auth-overlay-container">
          <div className="auth-overlay">
            <div className="auth-overlay-panel auth-overlay-left">
              <img
                src={billingHero}
                alt="STV Billing Software"
                className="auth-overlay-hero"
              />
              <h2>Business Portal</h2>
              <p>
                Sign in to streamline billing,
                track sales, and manage your business.
              </p>
              <button
                type="button"
                className="auth-btn ghost"
                onClick={() => switchPanel(false)}
              >
                SIGN IN
              </button>
            </div>
            <div className="auth-overlay-panel auth-overlay-right">
              <img
                src={billingSignupHero}
                alt="STV Billing Software"
                className="auth-overlay-hero"
              />
              <h2>Fast. Secure. Reliable.</h2>
              <p>
                Manage billing, inventory, customers,
                and reports from one powerful dashboard.
              </p>
              <button
                type="button"
                className="auth-btn ghost"
                onClick={() => switchPanel(true)}
              >
                SIGN UP
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
