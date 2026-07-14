import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FiBarChart2,
  FiBriefcase,
  FiClipboard,
  FiCreditCard,
  FiDollarSign,
  FiGrid,
  FiLogOut,
  FiMenu,
  FiSettings,
  FiShoppingBag,
  FiUser,
  FiUsers,
} from 'react-icons/fi';
import { getCompany } from '../../Services/apiService';
import { getItem, removeItem } from '../../Services/localService';
import { RoutePathName } from '../../routes/RoutePathName';
import ProfileModal from '../Profile/ProfileModal';
import '../Dashboard/Dashboard.css';

const DEFAULT_BRAND = 'STV Billing Software';

const navMain = [
  { id: 'dashboard', label: 'Dashboard', icon: FiGrid, path: RoutePathName.DASHBOARD },
  { id: 'food', label: 'Food items', icon: FiShoppingBag, path: RoutePathName.FOOD_ITEMS },
  { id: 'orders', label: 'Orders', icon: FiClipboard, path: RoutePathName.ORDERS },
  { id: 'billing', label: 'Billing', icon: FiCreditCard, path: RoutePathName.BILLING },
  { id: 'expenses', label: 'Expenses', icon: FiDollarSign, path: RoutePathName.EXPENSES },
];

const navAnalytics = [
  { id: 'reports', label: 'Reports', icon: FiBarChart2, path: RoutePathName.REPORTS },
  { id: 'guests', label: 'Guests', icon: FiUsers },
  { id: 'settings', label: 'Settings', icon: FiSettings },
];

const getInitials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'ST';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const formatToday = () =>
  new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const AppShell = ({ title, subtitle, children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef(null);

  const [navOpen, setNavOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [user, setUser] = useState(() => getItem('user'));
  const [brandName, setBrandName] = useState(DEFAULT_BRAND);

  const displayName = user?.fullName || 'Admin';
  const initials = useMemo(() => getInitials(displayName), [displayName]);

  const activeNav = useMemo(() => {
    if (location.pathname === RoutePathName.DASHBOARD) return 'dashboard';
    if (location.pathname === RoutePathName.FOOD_ITEMS) return 'food';
    if (location.pathname === RoutePathName.ORDERS) return 'orders';
    if (location.pathname === RoutePathName.BILLING) return 'billing';
    if (location.pathname === RoutePathName.EXPENSES) return 'expenses';
    if (location.pathname === RoutePathName.REPORTS) return 'reports';
    if (location.pathname === RoutePathName.COMPANY_PROFILE) return 'company-profile';
    return '';
  }, [location.pathname]);

  useEffect(() => {
    let active = true;

    const loadBrand = async () => {
      try {
        const data = await getCompany();
        if (!active) return;
        const name = String(data?.company?.companyName || '').trim();
        setBrandName(name || DEFAULT_BRAND);
      } catch {
        if (active) setBrandName(DEFAULT_BRAND);
      }
    };

    loadBrand();
    return () => {
      active = false;
    };
  }, [location.pathname]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const handleLogout = () => {
    removeItem('token');
    removeItem('user');
    navigate(RoutePathName.AUTH, { replace: true });
  };

  const onNavClick = (item) => {
    setNavOpen(false);
    if (item.path) navigate(item.path);
  };

  const openMyProfile = () => {
    setProfileOpen(false);
    setProfileModalOpen(true);
  };

  const openCompanyProfile = () => {
    setProfileOpen(false);
    navigate(RoutePathName.COMPANY_PROFILE);
  };

  return (
    <div className={`dash-shell${navOpen ? ' nav-open' : ''}`}>
      <div
        className="dash-overlay"
        onClick={() => setNavOpen(false)}
        aria-hidden={!navOpen}
      />

      <aside className="dash-sidebar">
        <div className="dash-brand">
          <div className="dash-brand-mark" aria-hidden>
            STV
          </div>
          <p className="dash-brand-text">{brandName}</p>
        </div>

        <nav className="dash-nav" aria-label="Main">
          <div className="dash-nav-group">
            <p className="dash-nav-label">Main</p>
            {navMain.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`dash-nav-item${activeNav === item.id ? ' is-active' : ''}`}
                  onClick={() => onNavClick(item)}
                >
                  <Icon />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="dash-nav-group">
            <p className="dash-nav-label">Analytics</p>
            {navAnalytics.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`dash-nav-item${activeNav === item.id ? ' is-active' : ''}`}
                  onClick={() => onNavClick(item)}
                >
                  <Icon />
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="dash-sidebar-foot">
          <button type="button" className="dash-logout" onClick={handleLogout}>
            <FiLogOut />
            Sign out
          </button>
        </div>
      </aside>

      <main className="dash-main">
        <header className="dash-topbar">
          <div className="dash-topbar-left">
            <button
              type="button"
              className="dash-menu-btn"
              aria-label="Open menu"
              onClick={() => setNavOpen(true)}
            >
              <FiMenu size={20} />
            </button>
            <div>
              <h1>{title}</h1>
              {subtitle ? <p>{subtitle}</p> : null}
            </div>
          </div>

          <div className="dash-topbar-meta">
            <span className="dash-date">{formatToday()}</span>

            <div className="dash-profile-menu" ref={menuRef}>
              <button
                type="button"
                className="dash-avatar"
                title={displayName}
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                onClick={() => setProfileOpen((open) => !open)}
              >
                {user?.profileImage ? (
                  <img src={user.profileImage} alt={displayName} />
                ) : (
                  initials
                )}
              </button>

              {profileOpen ? (
                <div className="dash-profile-dropdown" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    className="dash-profile-item"
                    onClick={openMyProfile}
                  >
                    <FiUser />
                    My Profile
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="dash-profile-item"
                    onClick={openCompanyProfile}
                  >
                    <FiBriefcase />
                    Company Profile
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {children}
      </main>

      <ProfileModal
        open={profileModalOpen}
        user={user}
        onClose={() => setProfileModalOpen(false)}
        onUpdated={(nextUser) => setUser(nextUser)}
      />
    </div>
  );
};

export default AppShell;
