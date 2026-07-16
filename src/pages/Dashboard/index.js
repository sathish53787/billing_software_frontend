import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { getDashboard } from '../../Services/apiService';
import { getItem } from '../../Services/localService';
import AppShell from '../Layout/AppShell';
import './Dashboard.css';

const formatINR = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  })}`;

const formatDisplayDate = (value) => {
  if (!value) return '—';
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [year, month, day] = raw.slice(0, 10).split('-');
    return `${day}-${month}-${year}`;
  }
  return raw;
};

const formatSigned = (value, suffix = '') => {
  const num = Number(value || 0);
  const sign = num > 0 ? '+' : num < 0 ? '' : '';
  return `${sign}${num}${suffix}`;
};

const trendClass = (value) => {
  const num = Number(value || 0);
  if (num > 0) return 'up';
  if (num < 0) return 'down';
  return 'neutral';
};

const emptyDashboard = {
  kpis: {
    todayRevenue: 0,
    revenueChangePct: 0,
    billsGenerated: 0,
    billsChange: 0,
    ordersServed: 0,
    ordersChange: 0,
    avgBillValue: 0,
    avgBillChangePct: 0,
    todayExpenses: 0,
    expenseChangePct: 0,
    expenseCount: 0,
    expenseCountChange: 0,
    netToday: 0,
    netChangePct: 0,
  },
  weeklyRevenue: [
    { day: 'Sun', value: 0, amount: 0 },
    { day: 'Mon', value: 0, amount: 0 },
    { day: 'Tue', value: 0, amount: 0 },
    { day: 'Wed', value: 0, amount: 0 },
    { day: 'Thu', value: 0, amount: 0 },
    { day: 'Fri', value: 0, amount: 0 },
    { day: 'Sat', value: 0, amount: 0 },
  ],
  categories: [
    { name: 'Lunch', pct: '0%', color: '#ff6b4a' },
    { name: 'Breakfast', pct: '0%', color: '#2f8fd8' },
    { name: 'Dinner', pct: '0%', color: '#1fa97a' },
    { name: 'Snacks', pct: '0%', color: '#9ca3af' },
  ],
  donutGradient: '#e5e7eb 0% 100%',
  topItems: [],
  recentBills: [],
  recentExpenses: [],
};

const Dashboard = () => {
  const user = getItem('user');
  const firstName = (user?.fullName || 'Admin').split(/\s+/)[0] || 'Admin';
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(emptyDashboard);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      setLoading(true);
      try {
        const data = await getDashboard();
        if (!active) return;
        if (!data?.success) {
          toast.error(data?.message || 'Failed to load dashboard');
          return;
        }
        setDashboard({
          ...emptyDashboard,
          ...data.dashboard,
          kpis: { ...emptyDashboard.kpis, ...(data.dashboard?.kpis || {}) },
          weeklyRevenue: data.dashboard?.weeklyRevenue?.length
            ? data.dashboard.weeklyRevenue
            : emptyDashboard.weeklyRevenue,
          categories: data.dashboard?.categories?.length
            ? data.dashboard.categories
            : emptyDashboard.categories,
          recentExpenses: data.dashboard?.recentExpenses || [],
        });
      } catch (error) {
        if (!active) return;
        toast.error(
          error?.response?.data?.message || error.message || 'Failed to load dashboard'
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDashboard();
    return () => {
      active = false;
    };
  }, []);

  const {
    kpis,
    weeklyRevenue,
    categories,
    donutGradient,
    topItems,
    recentBills,
    recentExpenses,
  } = dashboard;

  return (
    <AppShell
      title="Dashboard"
      subtitle={`Welcome back, ${firstName} — today's overview.`}
    >
      <section className="dash-kpi-row" aria-label="Today summary">
        <article className="dash-kpi">
          <p className="dash-kpi-label">Today&apos;s Revenue</p>
          <p className="dash-kpi-value">
            {loading ? '—' : formatINR(kpis.todayRevenue)}
          </p>
          <p className={`dash-kpi-trend ${trendClass(kpis.revenueChangePct)}`}>
            {formatSigned(kpis.revenueChangePct, '%')} vs yesterday
          </p>
        </article>
        <article className="dash-kpi">
          <p className="dash-kpi-label">Today&apos;s Expenses</p>
          <p className="dash-kpi-value">
            {loading ? '—' : formatINR(kpis.todayExpenses)}
          </p>
          <p className={`dash-kpi-trend ${trendClass(-kpis.expenseChangePct)}`}>
            {formatSigned(kpis.expenseChangePct, '%')} vs yesterday
          </p>
        </article>
        <article className="dash-kpi">
          <p className="dash-kpi-label">Net Today</p>
          <p className="dash-kpi-value">
            {loading ? '—' : formatINR(kpis.netToday)}
          </p>
          <p className={`dash-kpi-trend ${trendClass(kpis.netChangePct)}`}>
            {formatSigned(kpis.netChangePct, '%')} vs yesterday
          </p>
        </article>
        <article className="dash-kpi">
          <p className="dash-kpi-label">Bills Generated</p>
          <p className="dash-kpi-value">{loading ? '—' : kpis.billsGenerated}</p>
          <p className={`dash-kpi-trend ${trendClass(kpis.billsChange)}`}>
            {formatSigned(kpis.billsChange)} today
          </p>
        </article>
        <article className="dash-kpi">
          <p className="dash-kpi-label">Orders Served</p>
          <p className="dash-kpi-value">{loading ? '—' : kpis.ordersServed}</p>
          <p className={`dash-kpi-trend ${trendClass(kpis.ordersChange)}`}>
            {formatSigned(kpis.ordersChange)} orders
          </p>
        </article>
        <article className="dash-kpi">
          <p className="dash-kpi-label">Avg Bill Value</p>
          <p className="dash-kpi-value">
            {loading ? '—' : formatINR(kpis.avgBillValue)}
          </p>
          <p className={`dash-kpi-trend ${trendClass(kpis.avgBillChangePct)}`}>
            {formatSigned(kpis.avgBillChangePct, '%')} vs yesterday
          </p>
        </article>
      </section>

      <section className="dash-charts">
        <div className="dash-panel">
          <h2>Weekly Revenue</h2>
          <div className="dash-bars" role="img" aria-label="Weekly revenue bar chart">
            {weeklyRevenue.map((item) => (
              <div key={item.day} className="dash-bar-col">
                <div className="dash-bar-track">
                  <div
                    className="dash-bar"
                    style={{ height: `${Math.max(item.value || 0, item.amount ? 8 : 0)}%` }}
                    title={formatINR(item.amount)}
                  />
                </div>
                <span className="dash-bar-label">{item.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dash-panel">
          <h2>Orders by Category</h2>
          <div className="dash-donut-wrap">
            <div
              className="dash-donut"
              role="img"
              aria-label="Orders by category chart"
              style={{ background: `conic-gradient(${donutGradient})` }}
            />
            <ul className="dash-legend">
              {categories.map((cat) => (
                <li key={cat.name}>
                  <span className="dash-legend-left">
                    <span className="dash-dot" style={{ background: cat.color }} />
                    {cat.name}
                  </span>
                  <strong>{cat.pct}</strong>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="dash-bottom">
        <div className="dash-panel">
          <h2>Top Selling Items</h2>
          {topItems.length === 0 ? (
            <p className="dash-empty">No sales today yet.</p>
          ) : (
            <ul className="dash-sell-list">
              {topItems.map((item, index) => (
                <li key={item.name} className="dash-sell-item">
                  <span className="dash-rank">{index + 1}</span>
                  <div>
                    <p className="dash-sell-name">{item.name}</p>
                    <p className="dash-sell-meta">{item.orders} orders</p>
                  </div>
                  <p className="dash-sell-amount">{formatINR(item.amount)}</p>
                  <div className="dash-sell-bar">
                    <div className="dash-sell-fill" style={{ width: item.fill }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="dash-panel">
          <h2>Recent Bills</h2>
          <div className="dash-table-wrap">
            {recentBills.length === 0 ? (
              <p className="dash-empty">No bills generated yet.</p>
            ) : (
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Bill No</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBills.map((bill) => (
                    <tr key={bill.billNo}>
                      <td>{bill.billNo}</td>
                      <td>{bill.customer}</td>
                      <td>{formatINR(bill.amount)}</td>
                      <td>
                        <span
                          className={`dash-status ${
                            bill.status === 'Paid' ? 'paid' : 'pending'
                          }`}
                        >
                          {bill.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      <section className="dash-expenses" aria-label="Recent expenses">
        <div className="dash-panel">
          <h2>Recent Expenses</h2>
          <div className="dash-table-wrap">
            {recentExpenses.length === 0 ? (
              <p className="dash-empty">No expense records yet.</p>
            ) : (
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentExpenses.map((expense) => (
                    <tr key={expense.id}>
                      <td>{formatDisplayDate(expense.expenseDate)}</td>
                      <td>
                        <span className="dash-expense-cat">{expense.category}</span>
                      </td>
                      <td>{expense.description || '—'}</td>
                      <td>{formatINR(expense.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    </AppShell>
  );
};

export default Dashboard;
