import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import {
  createCompanyStart,
  loginStart,
  registerStart,
  resetAuthState,
} from '../../Store/Slices/handlers/AuthSlice';
import { getDashboardPath } from '../../Utils/tenant';
import { getItem } from '../../Services/localService';
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

const initialCompany = {
  companyName: '',
  companyPhone: '',
  access_url: '',
};

const Auth = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const auth = useSelector((state) => state.auth);

  const [isSignUp, setIsSignUp] = useState(false);
  const [showCompanySetup, setShowCompanySetup] = useState(false);
  const [signUpForm, setSignUpForm] = useState(initialSignUp);
  const [signInForm, setSignInForm] = useState(initialSignIn);
  const [companyForm, setCompanyForm] = useState(initialCompany);
  const [signUpErrors, setSignUpErrors] = useState({});
  const [signInErrors, setSignInErrors] = useState({});
  const [companyErrors, setCompanyErrors] = useState({});
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState(false);
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  useEffect(() => {
    const existing = getItem('user');
    const token = getItem('token');
    if (token && existing && (existing.is_company || existing.company?.access_url || existing.company)) {
      if (existing.is_company || existing.company?.access_url) {
        navigate(getDashboardPath(existing), { replace: true });
        return;
      }
    }
    if (token && existing && !(existing.is_company || existing.company)) {
      setShowCompanySetup(true);
      setIsSignUp(true);
      setCompanyForm((prev) => ({
        ...prev,
        companyPhone: existing.phone || '',
      }));
    }
  }, [navigate]);

  useEffect(() => {
    dispatch(resetAuthState());
  }, [dispatch]);

  useEffect(() => {
    if (auth.error) {
      toast.error(auth.error);
    }
  }, [auth.error]);

  useEffect(() => {
    if (auth.needsCompanySetup && auth.user?.accessToken) {
      toast.success(auth.message || 'Account created successfully');
      setShowCompanySetup(true);
      setIsSignUp(true);
      setCompanyForm((prev) => ({
        ...prev,
        companyPhone: auth.user?.phone || signUpForm.phone || '',
      }));
    }
  }, [auth.needsCompanySetup, auth.user, auth.message, signUpForm.phone]);

  useEffect(() => {
    if (auth.user?.accessToken && (auth.user?.is_company || auth.user?.company) && !auth.needsCompanySetup) {
      toast.success(auth.message || 'Logged in successfully');
      navigate(getDashboardPath(auth.user), { replace: true });
    }
  }, [auth.user, auth.needsCompanySetup, auth.message, navigate]);

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

  const onCompanyChange = (e) => {
    const { name, value } = e.target;
    let nextValue = value;
    if (name === 'access_url') {
      nextValue = String(value)
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-')
        .replace(/-+/g, '-');
    }
    setCompanyForm((prev) => ({ ...prev, [name]: nextValue }));
    setCompanyErrors((prev) => ({ ...prev, [name]: '' }));
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

  const validateCompany = () => {
    const errors = {};
    if (!companyForm.companyName.trim()) errors.companyName = 'Company name is required';
    if (!companyForm.companyPhone.trim()) errors.companyPhone = 'Company phone number is required';
    else if (!/^(\+\d{1,3}[- ]?)?\d{10}$/.test(companyForm.companyPhone.replace(/\s/g, ''))) {
      errors.companyPhone = 'Enter a valid 10-digit phone number';
    }
    if (!companyForm.access_url.trim()) errors.access_url = 'Access URL is required';
    else if (companyForm.access_url.trim().length < 3) {
      errors.access_url = 'Access URL must be at least 3 characters';
    }
    setCompanyErrors(errors);
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

  const handleCompanySubmit = (e) => {
    e.preventDefault();
    if (!validateCompany()) return;
    dispatch(
      createCompanyStart({
        companyName: companyForm.companyName.trim(),
        companyPhone: companyForm.companyPhone.replace(/\s/g, '').trim(),
        access_url: companyForm.access_url.trim().toLowerCase(),
      })
    );
  };

  const switchPanel = (showSignUp) => {
    if (showCompanySetup) return;
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
      <div className={`auth-container ${isSignUp || showCompanySetup ? 'right-panel-active' : ''}`}>
        <div className="auth-form-container auth-sign-up">
          {showCompanySetup ? (
            <form onSubmit={handleCompanySubmit} noValidate>
              <p className="auth-brand">STV Billing Software</p>
              <h2 className="auth-action-title">Company Details</h2>
              <span>Set up your business workspace</span>
              <input
                type="text"
                name="companyName"
                placeholder="Company Name"
                value={companyForm.companyName}
                onChange={onCompanyChange}
              />
              {companyErrors.companyName && (
                <p className="field-error">{companyErrors.companyName}</p>
              )}
              <input
                type="tel"
                name="companyPhone"
                placeholder="Company Phone Number"
                value={companyForm.companyPhone}
                onChange={onCompanyChange}
              />
              {companyErrors.companyPhone && (
                <p className="field-error">{companyErrors.companyPhone}</p>
              )}
              <input
                type="text"
                name="access_url"
                placeholder="Access URL (e.g. twinsday)"
                value={companyForm.access_url}
                onChange={onCompanyChange}
              />
              {companyErrors.access_url && (
                <p className="field-error">{companyErrors.access_url}</p>
              )}
              <p className="auth-hint">
                Your portal will open at /{companyForm.access_url || 'access-url'}/dashboard
              </p>
              <button type="submit" className="auth-btn" disabled={auth.loading}>
                {auth.loading ? 'Please wait...' : 'CONTINUE'}
              </button>
            </form>
          ) : (
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
          )}
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
                disabled={showCompanySetup}
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
