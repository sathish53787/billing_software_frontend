import React, { useCallback, useEffect, useState } from 'react';
import { FiRefreshCw, FiSearch } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { getReports } from '../../Services/apiService';
import DateRangePicker from '../../components/DateRangePicker/DateRangePicker';
import AppShell from '../Layout/AppShell';
import '../Dashboard/Dashboard.css';
import './Reports.css';

const todayInputValue = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
};

const currentMonthRange = () => {
  const today = todayInputValue();
  const [year, month] = today.split('-').map(Number);
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
};

const formatINR = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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

const emptySummary = {
  billCount: 0,
  paidBills: 0,
  pendingBills: 0,
  itemsSold: 0,
  grossSales: 0,
  totalGst: 0,
  totalRevenue: 0,
  collected: 0,
  outstanding: 0,
  avgBill: 0,
  netProfit: 0,
  netLoss: 0,
  netPosition: 0,
};

const Reports = () => {
  const initialRange = currentMonthRange();
  const [fromDate, setFromDate] = useState(initialRange.start);
  const [toDate, setToDate] = useState(initialRange.end);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState({
    summary: emptySummary,
    daily: [],
    categories: [],
    topItems: [],
    bills: [],
  });

  const loadReports = useCallback(async (from, to) => {
    setLoading(true);
    try {
      const data = await getReports({
        from_date: from,
        to_date: to || from,
      });
      if (!data?.success) {
        toast.error(data?.message || 'Failed to load reports');
        return;
      }
      setReport({
        summary: { ...emptySummary, ...(data.report?.summary || {}) },
        daily: data.report?.daily || [],
        categories: data.report?.categories || [],
        topItems: data.report?.topItems || [],
        bills: data.report?.bills || [],
        from_date: data.report?.from_date,
        to_date: data.report?.to_date,
      });
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error.message || 'Failed to load reports'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports(fromDate, toDate);
  }, [loadReports, fromDate, toDate]);

  const onApply = (e) => {
    e.preventDefault();
    if (!fromDate) {
      toast.error('Select from date');
      return;
    }
    const end = toDate || fromDate;
    if (fromDate > end) {
      toast.error('From date cannot be after to date');
      return;
    }
    loadReports(fromDate, end);
  };

  const setToday = () => {
    const today = todayInputValue();
    setFromDate(today);
    setToDate(today);
  };

  const { summary } = report;
  const rangeLabel =
    report.from_date && report.to_date
      ? report.from_date === report.to_date
        ? formatDisplayDate(report.from_date)
        : `${formatDisplayDate(report.from_date)} → ${formatDisplayDate(report.to_date)}`
      : '—';

  return (
    <AppShell
      title="Reports"
      subtitle="Date-wise revenue, orders, and profit & loss overview"
    >
      <form className="dash-panel reports-filters" onSubmit={onApply}>
        <DateRangePicker
          id="reportsDateRange"
          label="Select Date"
          fromDate={fromDate}
          toDate={toDate}
          onChange={({ fromDate: nextFrom, toDate: nextTo }) => {
            setFromDate(nextFrom);
            setToDate(nextTo);
          }}
        />
        <div className="reports-filter-actions">
          <button type="button" className="reports-chip-btn" onClick={setToday}>
            Today
          </button>
          <button
            type="button"
            className="reports-chip-btn"
            onClick={() => {
              const range = currentMonthRange();
              setFromDate(range.start);
              setToDate(range.end);
            }}
          >
            This month
          </button>
          <button type="submit" className="reports-apply-btn" disabled={loading}>
            {loading ? <FiRefreshCw className="is-spin" /> : <FiSearch />}
            {loading ? 'Loading...' : 'Apply Filter'}
          </button>
        </div>
      </form>

      <p className="reports-range">Showing report for <strong>{rangeLabel}</strong></p>

      <section className="dash-kpi-row reports-kpi" aria-label="Report summary">
        <article className="dash-kpi">
          <p className="dash-kpi-label">Total Revenue</p>
          <p className="dash-kpi-value">{formatINR(summary.totalRevenue)}</p>
          <p className="dash-kpi-trend neutral">{summary.billCount} bills</p>
        </article>
        <article className="dash-kpi">
          <p className="dash-kpi-label">Orders Sold</p>
          <p className="dash-kpi-value">{summary.itemsSold}</p>
          <p className="dash-kpi-trend neutral">Avg {formatINR(summary.avgBill)}</p>
        </article>
        <article className="dash-kpi">
          <p className="dash-kpi-label">Collected (Profit)</p>
          <p className="dash-kpi-value">{formatINR(summary.netProfit)}</p>
          <p className="dash-kpi-trend up">{summary.paidBills} paid bills</p>
        </article>
        <article className="dash-kpi">
          <p className="dash-kpi-label">Outstanding (Loss Risk)</p>
          <p className="dash-kpi-value">{formatINR(summary.netLoss)}</p>
          <p className="dash-kpi-trend down">{summary.pendingBills} pending</p>
        </article>
      </section>

      <section className="reports-pnl dash-panel">
        <h2>Profit &amp; Loss</h2>
        <div className="reports-pnl-grid">
          <div>
            <span>Gross Sales</span>
            <strong>{formatINR(summary.grossSales)}</strong>
          </div>
          <div>
            <span>GST Collected</span>
            <strong>{formatINR(summary.totalGst)}</strong>
          </div>
          <div>
            <span>Total Billing</span>
            <strong>{formatINR(summary.totalRevenue)}</strong>
          </div>
          <div>
            <span>Amount Collected</span>
            <strong className="is-profit">{formatINR(summary.collected)}</strong>
          </div>
          <div>
            <span>Outstanding</span>
            <strong className="is-loss">{formatINR(summary.outstanding)}</strong>
          </div>
          <div className="is-net">
            <span>Net Position</span>
            <strong className={summary.netPosition >= 0 ? 'is-profit' : 'is-loss'}>
              {formatINR(summary.netPosition)}
            </strong>
          </div>
        </div>
        <p className="reports-note">
          Net profit uses collected (paid) bills. Outstanding pending bills are shown as loss
          risk. Item cost is not tracked yet.
        </p>
      </section>

      <section className="reports-split">
        <div className="dash-panel">
          <h2>Date-wise Summary</h2>
          <div className="dash-table-wrap">
            {report.daily.length === 0 ? (
              <p className="dash-empty">No data for selected dates.</p>
            ) : (
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Bills</th>
                    <th>Orders</th>
                    <th>Revenue</th>
                    <th>Collected</th>
                    <th>Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {report.daily.map((day) => (
                    <tr key={day.date}>
                      <td>{formatDisplayDate(day.date)}</td>
                      <td>{day.bills}</td>
                      <td>{day.orders}</td>
                      <td>{formatINR(day.revenue)}</td>
                      <td>{formatINR(day.collected)}</td>
                      <td>{formatINR(day.outstanding)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="dash-panel">
          <h2>Top Items</h2>
          {report.topItems.length === 0 ? (
            <p className="dash-empty">No item sales in this range.</p>
          ) : (
            <ul className="dash-sell-list">
              {report.topItems.map((item, index) => (
                <li key={item.name} className="dash-sell-item">
                  <span className="dash-rank">{index + 1}</span>
                  <div>
                    <p className="dash-sell-name">{item.name}</p>
                    <p className="dash-sell-meta">{item.orders} orders</p>
                  </div>
                  <p className="dash-sell-amount">{formatINR(item.amount)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="dash-panel reports-bills">
        <h2>Bill Details</h2>
        <div className="dash-table-wrap">
          {report.bills.length === 0 ? (
            <p className="dash-empty">No bills found for selected dates.</p>
          ) : (
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Bill No</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Subtotal</th>
                  <th>GST</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {report.bills.map((bill) => (
                  <tr key={bill.billNo}>
                    <td>{bill.billNo}</td>
                    <td>{formatDisplayDate(bill.billDate)}</td>
                    <td>{bill.customerName}</td>
                    <td>{bill.itemCount}</td>
                    <td>{formatINR(bill.subtotal)}</td>
                    <td>{formatINR(bill.totalGst)}</td>
                    <td>{formatINR(bill.grandTotal)}</td>
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
      </section>
    </AppShell>
  );
};

export default Reports;
