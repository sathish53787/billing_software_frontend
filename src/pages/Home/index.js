import React from 'react';
import { getItem, removeItem } from '../../Services/localService';
import { useNavigate } from 'react-router-dom';
import { RoutePathName } from '../../routes/RoutePathName';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const user = getItem('user');

  const handleLogout = () => {
    removeItem('token');
    removeItem('user');
    navigate(RoutePathName.AUTH, { replace: true });
  };

  return (
    <div className="home-page">
      <div className="home-card">
        <p className="home-brand">STV Billing Software</p>
        <h1>Welcome{user?.fullName ? `, ${user.fullName}` : ''}</h1>
        <p className="home-copy">
          You are signed in. Billing modules will be added next.
        </p>
        <button type="button" onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </div>
  );
};

export default Home;
