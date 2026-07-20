import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiPlus,
  FiTrash2,
  FiX,
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import {
  createExpense,
  deleteExpense,
  getExpenses,
  updateExpense,
} from '../../Services/apiService';
import DateRangePicker from '../../components/DateRangePicker/DateRangePicker';
import AppShell from '../Layout/AppShell';
import '../Dashboard/Dashboard.css';
import './Expenses.css';

const EXPENSE_CATEGORIES = [
  'Rent',
  'Gas',
  'Water',
  'Electricity',
  'Salaries',
  'Raw Materials',
  'Packaging',
  'Maintenance',
  'Transport',
  'Marketing',
  'Others',
];

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

const formatDisplayDate = (value) => {
  if (!value) return '—';
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [year, month, day] = raw.slice(0, 10).split('-');
    return `${day}-${month}-${year}`;
  }
  return raw;
};

const formatINR = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const emptyForm = {
  expenseDate: todayInputValue(),
  category: '',
  amount: '',
  description: '',
};

const Expenses = () => {
  const initialRange = currentMonthRange();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState(EXPENSE_CATEGORIES);
  const [stats, setStats] = useState({ totalCount: 0, totalAmount: 0 });
  const [fromDate, setFromDate] = useState(initialRange.start);
  const [toDate, setToDate] = useState(initialRange.end);
  const [filterCategory, setFilterCategory] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getExpenses({
        from_date: fromDate,
        to_date: toDate || fromDate,
        category: filterCategory,
        page,
        limit: pageSize,
        count: pageSize,
      });
      if (!data?.success) {
        toast.error(data?.message || 'Failed to load expenses');
        return;
      }
      setExpenses(data.expenses || []);
      if (Array.isArray(data.categories) && data.categories.length) {
        setCategories(data.categories);
      }
      setStats(data.stats || { totalCount: 0, totalAmount: 0 });
      const pagination = data.pagination || {};
      const nextTotal = Number(pagination.total) || 0;
      const nextPages = Math.max(
        1,
        Number(pagination.totalPages) || Math.ceil(nextTotal / pageSize) || 1
      );
      setTotal(nextTotal);
      setTotalPages(nextPages);
      if (page > nextPages) setPage(nextPages);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error.message || 'Failed to load expenses'
      );
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, filterCategory, page, pageSize]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  useEffect(() => {
    setPage(1);
  }, [fromDate, toDate, filterCategory, pageSize]);

  const paginationInfo = useMemo(() => {
    const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return { start, end };
  }, [page, pageSize, total]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, expenseDate: todayInputValue() });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      expenseDate: row.expenseDate || todayInputValue(),
      category: row.category || '',
      amount: row.amount === 0 || row.amount ? String(row.amount) : '',
      description: row.description || '',
    });
    setErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
    setErrors({});
  };

  const validate = () => {
    const next = {};
    if (!form.expenseDate) next.expenseDate = 'Date is required';
    if (!form.category) next.category = 'Category is required';
    const amount = Number(form.amount);
    if (form.amount === '' || Number.isNaN(amount) || amount < 0) {
      next.amount = 'Enter a valid amount';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        expenseDate: form.expenseDate,
        category: form.category,
        amount: Number(form.amount),
        description: form.description.trim(),
      };
      const data = editing
        ? await updateExpense(editing._id, payload)
        : await createExpense(payload);
      if (!data?.success) {
        toast.error(data?.message || 'Failed to save expense');
        return;
      }
      toast.success(editing ? 'Expense updated' : 'Expense added');
      setModalOpen(false);
      setEditing(null);
      await loadExpenses();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error.message || 'Failed to save expense'
      );
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!deleteTarget?._id) return;
    setDeleting(true);
    try {
      const data = await deleteExpense(deleteTarget._id);
      if (!data?.success) {
        toast.error(data?.message || 'Failed to delete expense');
        return;
      }
      toast.success('Expense deleted');
      setDeleteTarget(null);
      await loadExpenses();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error.message || 'Failed to delete expense'
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell title="Expenses" subtitle="Track daily business expenses by category">
      <section className="dash-kpi-row expense-kpi-row" aria-label="Expense summary">
        <article className="dash-kpi expense-kpi">
          <p className="dash-kpi-label">Total Expenses</p>
          <p className="dash-kpi-value">{formatINR(stats.totalAmount)}</p>
        </article>
        <article className="dash-kpi expense-kpi">
          <p className="dash-kpi-label">Records</p>
          <p className="dash-kpi-value">{stats.totalCount || 0}</p>
        </article>
      </section>

      <div className="dash-panel expense-panel">
        <div className="expense-panel-head">
          <h2>All Expenses</h2>
          <button type="button" className="expense-add-btn" onClick={openAdd}>
            <FiPlus size={16} />
            Add Expense
          </button>
        </div>

        <div className="expense-filters">
          <DateRangePicker
            id="expenseDateRange"
            label="Select Date"
            fromDate={fromDate}
            toDate={toDate}
            onChange={({ fromDate: nextFrom, toDate: nextTo }) => {
              setFromDate(nextFrom);
              setToDate(nextTo);
            }}
          />
          <div className="expense-field">
            <label htmlFor="expenseFilterCategory">Category</label>
            <select
              id="expenseFilterCategory"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="expense-table-wrap">
          {loading ? (
            <p className="expense-empty">Loading expenses...</p>
          ) : expenses.length === 0 ? (
            <p className="expense-empty">No expenses found for selected filters.</p>
          ) : (
            <>
              <table className="expense-table">
                <thead>
                  <tr>
                    <th>Expense Date</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((row, index) => (
                    <tr key={row._id} style={{ animationDelay: `${index * 0.04}s` }}>
                      <td>{formatDisplayDate(row.expenseDate)}</td>
                      <td>
                        <span className="expense-chip">{row.category}</span>
                      </td>
                      <td className="expense-desc">{row.description || '—'}</td>
                      <td>
                        <span className="expense-amount">{formatINR(row.amount)}</span>
                      </td>
                      <td>
                        <div className="expense-actions">
                          <button
                            type="button"
                            className="expense-action-btn is-edit"
                            title="Edit"
                            aria-label="Edit expense"
                            onClick={() => openEdit(row)}
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            type="button"
                            className="expense-action-btn is-delete"
                            title="Delete"
                            aria-label="Delete expense"
                            onClick={() => setDeleteTarget(row)}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="expense-pagination">
                <div className="expense-pagination-info">
                  Showing {paginationInfo.start}–{paginationInfo.end} of {total}
                </div>
                <div className="expense-pagination-controls">
                  <label className="expense-page-size" htmlFor="expensePageSize">
                    Rows
                    <select
                      id="expensePageSize"
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    className="expense-page-btn"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label="Previous page"
                  >
                    <FiChevronLeft size={16} />
                  </button>
                  <span className="expense-page-indicator">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    className="expense-page-btn"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    aria-label="Next page"
                  >
                    <FiChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {modalOpen ? (
        <div className="expense-modal-overlay" onClick={closeModal} role="presentation">
          <div
            className="expense-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="expense-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="expense-modal-head">
              <div>
                <h2 id="expense-modal-title">
                  {editing ? 'Edit Expense' : 'Add Expense'}
                </h2>
                <p>Enter expense date, category and amount</p>
              </div>
              <button
                type="button"
                className="expense-modal-close"
                aria-label="Close"
                onClick={closeModal}
              >
                <FiX size={18} />
              </button>
            </div>

            <form className="expense-modal-form" onSubmit={onSubmit}>
              <label htmlFor="expenseDate">Expense Date *</label>
              <input
                id="expenseDate"
                type="date"
                value={form.expenseDate}
                onChange={(e) => setForm((prev) => ({ ...prev, expenseDate: e.target.value }))}
              />
              {errors.expenseDate ? (
                <span className="expense-error">{errors.expenseDate}</span>
              ) : null}

              <label htmlFor="expenseCategory">Category *</label>
              <select
                id="expenseCategory"
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {errors.category ? (
                <span className="expense-error">{errors.category}</span>
              ) : null}

              <label htmlFor="expenseAmount">Amount *</label>
              <input
                id="expenseAmount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              />
              {errors.amount ? <span className="expense-error">{errors.amount}</span> : null}

              <label htmlFor="expenseDescription">Description</label>
              <textarea
                id="expenseDescription"
                rows={3}
                placeholder="Optional notes"
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
              />

              <div className="expense-modal-actions">
                <button type="button" className="expense-btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="expense-btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editing ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div
          className="expense-modal-overlay"
          onClick={() => !deleting && setDeleteTarget(null)}
          role="presentation"
        >
          <div
            className="expense-modal expense-delete-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="expense-modal-head">
              <div>
                <h2>Delete Expense</h2>
                <p>
                  Delete {deleteTarget.category} expense of {formatINR(deleteTarget.amount)}?
                </p>
              </div>
              <button
                type="button"
                className="expense-modal-close"
                aria-label="Close"
                onClick={() => setDeleteTarget(null)}
              >
                <FiX size={18} />
              </button>
            </div>
            <div className="expense-modal-actions">
              <button
                type="button"
                className="expense-btn-secondary"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="expense-btn-danger"
                onClick={onDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
};

export default Expenses;
