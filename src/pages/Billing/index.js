import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  FiArrowLeft,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiEye,
  FiMinus,
  FiPlus,
  FiPrinter,
  FiSearch,
  FiShoppingCart,
  FiTrash2,
  FiX,
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import {
  createBill,
  deleteBill,
  getBills,
  getCompany,
  getFoodItems,
  getNextBillInfo,
  updateBill,
} from '../../Services/apiService';
import AppShell from '../Layout/AppShell';
import DateRangePicker from '../../components/DateRangePicker/DateRangePicker';
import '../Dashboard/Dashboard.css';
import '../FoodItems/FoodItems.css';
import BillInvoice from './BillInvoice';
import './Billing.css';

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

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

const formatCategories = (category) => {
  if (Array.isArray(category)) return category.join(', ');
  return category || '—';
};

const formatDisplayDate = (value) => {
  if (!value) return '—';
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw.slice(0, 10)) && raw.length <= 10) {
    const [year, month, day] = raw.slice(0, 10).split('-');
    return `${day}-${month}-${year}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      const [year, month, day] = raw.slice(0, 10).split('-');
      return `${day}-${month}-${year}`;
    }
    return raw;
  }
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${get('day')}-${get('month')}-${get('year')}`;
};

const formatDisplayTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(date);

  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  const hour = get('hour');
  const minute = get('minute');
  const period = get('dayPeriod');
  if (!hour || !minute) return '—';
  return `${hour}:${minute} ${period}`.trim();
};

const formatINR = (value) => `₹${Number(value || 0).toFixed(2)}`;

const buildCartLines = (cart) =>
  Object.values(cart).map((line) => {
    const quantity = Number(line.quantity);
    const safeQty = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
    const subtotal = round2(line.price * safeQty);
    const gstAmount = round2((subtotal * line.gstPercent) / 100);
    const lineTotal = round2(subtotal + gstAmount);
    return { ...line, quantity: line.quantity, safeQty, subtotal, gstAmount, lineTotal };
  });

const buildTotals = (lines) => {
  const subtotal = round2(lines.reduce((sum, line) => sum + line.subtotal, 0));
  const totalGst = round2(lines.reduce((sum, line) => sum + line.gstAmount, 0));
  const grandTotal = round2(subtotal + totalGst);
  const itemCount = lines.reduce((sum, line) => sum + (line.safeQty || 0), 0);
  return { subtotal, totalGst, grandTotal, itemCount };
};

const cartFromBillItems = (items = []) => {
  const cart = {};
  items.forEach((item) => {
    const foodItemId = String(item.foodItemId?._id || item.foodItemId);
    cart[foodItemId] = {
      foodItemId,
      itemName: item.itemName,
      type: item.type,
      category: item.category,
      price: item.price,
      gstPercent: item.gstPercent,
      quantity: item.quantity,
    };
  });
  return cart;
};

const Billing = () => {
  const user = useSelector((state) => state.auth?.user);
  const [foodItems, setFoodItems] = useState([]);
  const [company, setCompany] = useState(null);
  const [cart, setCart] = useState({});
  const [search, setSearch] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [billDate, setBillDate] = useState(todayInputValue);
  const [billNo, setBillNo] = useState('—');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatedBill, setGeneratedBill] = useState(null);
  const [pageView, setPageView] = useState('list');
  const [bills, setBills] = useState([]);
  const [billsLoading, setBillsLoading] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [billSearch, setBillSearch] = useState('');
  const [selectedBillId, setSelectedBillId] = useState(null);
  const [fromDate, setFromDate] = useState(() => todayInputValue());
  const [toDate, setToDate] = useState(() => todayInputValue());
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(10);
  const [listTotal, setListTotal] = useState(0);
  const [listTotalPages, setListTotalPages] = useState(1);

  const isEditing = Boolean(editingBill?._id);

  const toInputDate = (value) => {
    if (!value) return todayInputValue();
    const raw = String(value);
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return todayInputValue();
    return date.toISOString().slice(0, 10);
  };

  const loadBills = useCallback(async () => {
    setBillsLoading(true);
    try {
      const data = await getBills({
        from_date: fromDate,
        to_date: toDate || fromDate,
        page: listPage,
        count: listPageSize,
        limit: listPageSize,
      });
      if (!data?.success) {
        toast.error(data?.message || 'Failed to load bills');
        return;
      }
      setBills(data.bills || []);
      const pagination = data.pagination || {};
      const total = Number(pagination.total) || 0;
      const totalPages = Math.max(
        1,
        Number(pagination.totalPages) || Math.ceil(total / listPageSize) || 1
      );
      setListTotal(total);
      setListTotalPages(totalPages);
      if (listPage > totalPages) setListPage(totalPages);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error.message || 'Failed to load bills'
      );
    } finally {
      setBillsLoading(false);
    }
  }, [fromDate, toDate, listPage, listPageSize]);

  const openBillsView = async () => {
    setEditingBill(null);
    setCart({});
    setCustomerName('');
    setSearch('');
    setPageView('list');
    await loadBills();
  };

  const startNewBill = async () => {
    setEditingBill(null);
    setCart({});
    setCustomerName('');
    setSearch('');
    setBillDate(todayInputValue());
    setPageView('create');
    await loadNextBillInfo();
  };

  const openEditBill = (bill) => {
    setEditingBill(bill);
    setCustomerName(bill.customerName || '');
    setCart(cartFromBillItems(bill.items));
    setBillNo(bill.billNo || '—');
    setBillDate(toInputDate(bill.billDate || bill.createdAt));
    setSearch('');
    setPageView('create');
  };

  const loadNextBillInfo = async () => {
    try {
      const data = await getNextBillInfo();
      if (data?.success) {
        setBillNo(data.billNo || '—');
      }
    } catch {
      setBillNo('—');
    }
  };

  const refreshCompany = async () => {
    try {
      const companyData = await getCompany();
      if (companyData?.success) {
        setCompany(companyData.company || null);
      }
    } catch {
      // keep existing company state
    }
  };

  const openInvoice = async (bill) => {
    await refreshCompany();
    setGeneratedBill(bill);
  };

  useEffect(() => {
    let active = true;

    const loadPage = async () => {
      setLoading(true);
      try {
        const [foodData, companyData] = await Promise.all([
          getFoodItems(),
          getCompany().catch(() => null),
          loadNextBillInfo(),
        ]);
        if (!active) return;
        if (!foodData?.success) {
          toast.error(foodData?.message || 'Failed to load food items');
          return;
        }
        setFoodItems((foodData.items || []).filter((item) => item.available));
        if (companyData?.success) {
          setCompany(companyData.company || null);
        }
      } catch (error) {
        if (!active) return;
        toast.error(
          error?.response?.data?.message || error.message || 'Failed to load food items'
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    loadPage();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (pageView === 'list') loadBills();
  }, [pageView, loadBills]);

  useEffect(() => {
    setListPage(1);
  }, [fromDate, toDate, listPageSize]);

  const listPagination = useMemo(() => {
    const start = listTotal === 0 ? 0 : (listPage - 1) * listPageSize + 1;
    const end = Math.min(listPage * listPageSize, listTotal);
    return {
      start,
      end,
      total: listTotal,
      totalPages: listTotalPages,
    };
  }, [listTotal, listTotalPages, listPage, listPageSize]);

  const filteredBills = useMemo(() => {
    const q = billSearch.trim().toLowerCase();
    if (!q) return bills;
    return bills.filter((bill) => {
      const billNo = String(bill.billNo || '').toLowerCase();
      const customer = String(bill.customerName || '').toLowerCase();
      const status = String(bill.status || '').toLowerCase();
      return billNo.includes(q) || customer.includes(q) || status.includes(q);
    });
  }, [bills, billSearch]);

  const printInvoice = () => {
    window.print();
  };

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return foodItems;
    return foodItems.filter((item) =>
      String(item.itemName || '').toLowerCase().includes(q)
    );
  }, [foodItems, search]);

  const cartLines = useMemo(() => buildCartLines(cart), [cart]);

  const totals = useMemo(() => buildTotals(cartLines), [cartLines]);

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev[item._id];
      return {
        ...prev,
        [item._id]: {
          foodItemId: item._id,
          itemName: item.itemName,
          type: item.type,
          category: item.category,
          price: item.price,
          gstPercent: item.gstPercent,
          quantity: existing ? existing.quantity + 1 : 1,
        },
      };
    });
  };

  const updateQuantity = (foodItemId, nextQty) => {
    setCart((prev) => {
      if (!prev[foodItemId]) return prev;
      if (nextQty < 1) {
        const copy = { ...prev };
        delete copy[foodItemId];
        return copy;
      }
      return {
        ...prev,
        [foodItemId]: {
          ...prev[foodItemId],
          quantity: nextQty,
        },
      };
    });
  };

  const setQuantityFromInput = (foodItemId, rawValue) => {
    if (rawValue === '') {
      setCart((prev) => {
        if (!prev[foodItemId]) return prev;
        return {
          ...prev,
          [foodItemId]: {
            ...prev[foodItemId],
            quantity: '',
          },
        };
      });
      return;
    }

    const qty = parseInt(rawValue, 10);
    if (Number.isNaN(qty) || qty < 0) return;
    updateQuantity(foodItemId, qty);
  };

  const commitQuantityInput = (foodItemId) => {
    setCart((prev) => {
      const line = prev[foodItemId];
      if (!line) return prev;
      const qty = Number(line.quantity);
      if (!qty || qty < 1) {
        return {
          ...prev,
          [foodItemId]: {
            ...line,
            quantity: 1,
          },
        };
      }
      return prev;
    });
  };

  const clearCart = () => {
    setCart({});
  };

  const confirmDeleteBill = async () => {
    if (!deleteTarget?._id) return;
    setDeleting(true);
    try {
      const data = await deleteBill(deleteTarget._id);
      if (!data?.success) {
        toast.error(data?.message || 'Failed to delete bill');
        return;
      }
      toast.success(data.message || 'Bill deleted successfully');
      setDeleteTarget(null);
      await loadBills();
      await loadNextBillInfo();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error.message || 'Failed to delete bill'
      );
    } finally {
      setDeleting(false);
    }
  };

  const generateBill = async () => {
    const billItems = cartLines
      .filter((line) => line.safeQty >= 1)
      .map((line) => ({
        foodItemId: line.foodItemId,
        quantity: line.safeQty,
      }));

    if (!billItems.length) {
      toast.error('Select at least one food item');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        customerName: customerName.trim(),
        billDate,
        status: editingBill?.status || 'Paid',
        items: billItems,
      };

      const data = isEditing
        ? await updateBill(editingBill._id, payload)
        : await createBill(payload);

      if (!data?.success) {
        toast.error(
          data?.message || (isEditing ? 'Failed to update bill' : 'Failed to generate bill')
        );
        return;
      }

      setGeneratedBill(data.bill);
      clearCart();
      setCustomerName('');
      setEditingBill(null);
      setBillDate(todayInputValue());
      setPageView('list');
      await refreshCompany();
      await loadNextBillInfo();
      await loadBills();
      toast.success(
        data.message || (isEditing ? 'Bill updated successfully' : 'Bill generated successfully')
      );
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          (isEditing ? 'Failed to update bill' : 'Failed to generate bill')
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      title="Billing"
      subtitle={
        pageView === 'list'
          ? 'View, edit, or delete generated bills'
          : isEditing
            ? 'Update items and save the same invoice'
            : 'Select items, set quantity, and generate bill'
      }
    >
      <div className="billing-toolbar">
        <div className="billing-toolbar-left">
          {pageView === 'create' ? (
            <button
              type="button"
              className="billing-back-btn"
              aria-label="Back to bill records"
              title="Back to bill records"
              onClick={openBillsView}
            >
              <FiArrowLeft />
            </button>
          ) : null}
          {isEditing ? (
            <p className="billing-edit-banner">
              Editing bill <strong>{editingBill.billNo}</strong> — update items and save
            </p>
          ) : null}
        </div>
        {pageView === 'list' ? null : !isEditing ? (
          <button type="button" className="billing-view-btn" onClick={openBillsView}>
            View Bills
          </button>
        ) : (
          <button type="button" className="billing-view-btn is-active" onClick={startNewBill}>
            New Bill
          </button>
        )}
      </div>

      {pageView === 'create' ? (
        <>
      <section className="dash-panel billing-meta">
        <div className="billing-meta-field">
          <label htmlFor="customerName">Customer / Table</label>
          <input
            id="customerName"
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Table 7 — Mr. Raja"
          />
        </div>

        <div className="billing-meta-field">
          <span className="billing-meta-label">Bill Date</span>
          <p className="billing-meta-value">{formatDisplayDate(billDate)}</p>
        </div>

        <div className="billing-meta-field">
          <span className="billing-meta-label">Bill No.</span>
          <p className={`billing-meta-value${isEditing ? ' is-editing' : ''}`}>{billNo}</p>
        </div>
      </section>

      <div className="billing-layout">
        <section className="dash-panel billing-menu">
          <div className="billing-menu-head">
            <div>
              <h2>Food Menu</h2>
              <p>Available items with price</p>
            </div>
            <div className="billing-search">
              <FiSearch />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search food item"
              />
            </div>
          </div>

          {loading ? (
            <p className="billing-empty">Loading menu...</p>
          ) : filteredItems.length === 0 ? (
            <p className="billing-empty">
              {foodItems.length === 0
                ? 'No available food items. Add items from Food Items first.'
                : 'No items match your search.'}
            </p>
          ) : (
            <div className="billing-menu-grid">
              {filteredItems.map((item) => {
                const inCart = cart[item._id];
                return (
                  <article
                    key={item._id}
                    className={`billing-food-card${inCart ? ' is-selected' : ''}`}
                  >
                    <div className="billing-food-top">
                      <div>
                        <h3>{item.itemName}</h3>
                        <p>{formatCategories(item.category)}</p>
                      </div>
                    </div>

                    <div className="billing-food-meta">
                      <span
                        className={`billing-type ${
                          item.type === 'Veg' ? 'is-veg' : 'is-nonveg'
                        }`}
                      >
                        {item.type}
                      </span>
                      <span className="billing-price">₹{Number(item.price).toFixed(2)}</span>
                    </div>

                    <div className="billing-food-foot">
                      <span className="billing-gst">GST {item.gstPercent}%</span>
                      {inCart ? (
                        <div className="billing-qty">
                          <button
                            type="button"
                            aria-label="Decrease quantity"
                            onClick={() => updateQuantity(item._id, Number(inCart.quantity) - 1)}
                          >
                            <FiMinus />
                          </button>
                          <input
                            type="number"
                            min="1"
                            className="billing-qty-input"
                            value={inCart.quantity}
                            onChange={(e) => setQuantityFromInput(item._id, e.target.value)}
                            onBlur={() => commitQuantityInput(item._id)}
                            aria-label="Quantity"
                          />
                          <button
                            type="button"
                            aria-label="Increase quantity"
                            onClick={() =>
                              updateQuantity(item._id, Number(inCart.quantity || 0) + 1)
                            }
                          >
                            <FiPlus />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="billing-add-btn"
                          onClick={() => addToCart(item)}
                        >
                          <FiPlus />
                          Add
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="dash-panel billing-cart">
          <div className="billing-cart-head">
            <div className="billing-cart-title">
              <FiShoppingCart />
              <div>
                <h2>{isEditing ? 'Edit Bill' : 'Current Bill'}</h2>
                <p>
                  {totals.itemCount} item(s) selected
                  {isEditing ? ` · #${editingBill.billNo}` : ''}
                </p>
              </div>
            </div>
            {cartLines.length > 0 ? (
              <button type="button" className="billing-clear" onClick={clearCart}>
                Clear
              </button>
            ) : null}
          </div>

          <div className="billing-cart-list">
            {cartLines.length === 0 ? (
              <p className="billing-empty">Select food items to build the bill.</p>
            ) : (
              cartLines.map((line) => (
                <div key={line.foodItemId} className="billing-cart-line">
                  <div>
                    <p className="billing-line-name">{line.itemName}</p>
                    <p className="billing-line-meta">
                      ₹{Number(line.price).toFixed(2)} × {line.safeQty || 0}
                    </p>
                  </div>
                  <div className="billing-line-right">
                    <div className="billing-qty compact">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() =>
                          updateQuantity(line.foodItemId, Number(line.quantity) - 1)
                        }
                      >
                        <FiMinus />
                      </button>
                      <input
                        type="number"
                        min="1"
                        className="billing-qty-input"
                        value={line.quantity}
                        onChange={(e) =>
                          setQuantityFromInput(line.foodItemId, e.target.value)
                        }
                        onBlur={() => commitQuantityInput(line.foodItemId)}
                        aria-label="Quantity"
                      />
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() =>
                          updateQuantity(
                            line.foodItemId,
                            Number(line.quantity || 0) + 1
                          )
                        }
                      >
                        <FiPlus />
                      </button>
                    </div>
                    <strong>₹{line.lineTotal.toFixed(2)}</strong>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="billing-summary">
            <div>
              <span>Subtotal</span>
              <strong>₹{totals.subtotal.toFixed(2)}</strong>
            </div>
            <div>
              <span>GST</span>
              <strong>₹{totals.totalGst.toFixed(2)}</strong>
            </div>
            <div className="billing-grand">
              <span>Grand Total</span>
              <strong>₹{totals.grandTotal.toFixed(2)}</strong>
            </div>
          </div>

          <button
            type="button"
            className="billing-generate-btn"
            disabled={saving || !cartLines.length}
            onClick={generateBill}
          >
            {saving
              ? isEditing
                ? 'Updating...'
                : 'Generating...'
              : isEditing
                ? 'Update & Print Invoice'
                : 'Generate Bill'}
          </button>
        </aside>
      </div>
        </>
      ) : (
        <div className="dash-panel food-panel billing-bills-panel">
          <div className="food-panel-head">
            <h2>Bill Records</h2>
            <button type="button" className="food-add-btn" onClick={startNewBill}>
              <FiPlus />
              New Bill
            </button>
          </div>

          <div className="food-filters billing-bills-filters">
            <DateRangePicker
              id="billsDateRange"
              label="Select Date"
              fromDate={fromDate}
              toDate={toDate}
              onChange={({ fromDate: nextFrom, toDate: nextTo }) => {
                setFromDate(nextFrom);
                setToDate(nextTo);
              }}
            />
            <div className="billing-bills-field">
              <label htmlFor="billSearch">Search Bill</label>
              <div className="food-search">
                <FiSearch />
                <input
                  id="billSearch"
                  type="text"
                  value={billSearch}
                  onChange={(e) => setBillSearch(e.target.value)}
                  placeholder="Bill no / customer"
                />
              </div>
            </div>
          </div>

          <div className="food-table-wrap">
            {billsLoading ? (
              <p className="food-empty">Loading bills...</p>
            ) : filteredBills.length === 0 ? (
              <p className="food-empty">
                {bills.length === 0
                  ? 'No bills generated yet. Click New Bill to create one.'
                  : 'No bills match your search.'}
              </p>
            ) : (
              <table className="food-table">
                <thead>
                  <tr>
                    <th>Bill No</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBills.map((bill, index) => (
                    <tr
                      key={bill._id}
                      className={selectedBillId === bill._id ? 'is-selected' : ''}
                      style={{ animationDelay: `${index * 0.04}s` }}
                      onClick={() =>
                        setSelectedBillId((prev) => (prev === bill._id ? null : bill._id))
                      }
                    >
                      <td>
                        <span className="food-item-name">{bill.billNo}</span>
                      </td>
                      <td>{formatDisplayDate(bill.billDate || bill.createdAt)}</td>
                      <td>{formatDisplayTime(bill.createdAt || bill.billDate)}</td>
                      <td>{bill.customerName || '—'}</td>
                      <td>{bill.itemCount}</td>
                      <td>
                        <span className="food-price">{formatINR(bill.grandTotal)}</span>
                      </td>
                      <td>
                        <span
                          className={`food-avail-badge ${
                            bill.status === 'Paid' ? 'is-yes' : 'is-no'
                          }`}
                        >
                          {bill.status || 'Paid'}
                        </span>
                      </td>
                      <td>
                        <div className="food-actions">
                          <button
                            type="button"
                            className="food-action-btn is-edit"
                            title="View invoice"
                            aria-label={`View bill ${bill.billNo}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              openInvoice(bill);
                            }}
                          >
                            <FiEye />
                          </button>
                          <button
                            type="button"
                            className="food-action-btn is-edit"
                            title="Edit bill"
                            aria-label={`Edit bill ${bill.billNo}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditBill(bill);
                            }}
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            type="button"
                            className="food-action-btn is-delete"
                            title="Delete bill"
                            aria-label={`Delete bill ${bill.billNo}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(bill);
                            }}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {!billsLoading && listTotal > 0 ? (
              <div className="billing-pagination">
                <div className="billing-pagination-info">
                  Showing {listPagination.start}–{listPagination.end} of{' '}
                  {listPagination.total}
                </div>
                <div className="billing-pagination-controls">
                  <label className="billing-page-size" htmlFor="billsPageSize">
                    Rows
                    <select
                      id="billsPageSize"
                      value={listPageSize}
                      onChange={(e) => setListPageSize(Number(e.target.value))}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    className="billing-page-btn"
                    disabled={listPage <= 1}
                    onClick={() => setListPage((p) => Math.max(1, p - 1))}
                    aria-label="Previous page"
                  >
                    <FiChevronLeft size={16} />
                  </button>
                  <span className="billing-page-indicator">
                    {listPage} / {listPagination.totalPages}
                  </span>
                  <button
                    type="button"
                    className="billing-page-btn"
                    disabled={listPage >= listPagination.totalPages}
                    onClick={() =>
                      setListPage((p) => Math.min(listPagination.totalPages, p + 1))
                    }
                    aria-label="Next page"
                  >
                    <FiChevronRight size={16} />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {deleteTarget ? (
        <div
          className="billing-modal-overlay"
          onClick={() => setDeleteTarget(null)}
          role="presentation"
        >
          <div
            className="billing-modal billing-delete-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Delete Bill?</h2>
            <p>
              Remove bill <strong>{deleteTarget.billNo}</strong> for{' '}
              {deleteTarget.customerName || 'walk-in customer'}? This cannot be undone.
            </p>
            <div className="billing-edit-actions">
              <button
                type="button"
                className="billing-chip-btn"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="billing-delete-btn"
                disabled={deleting}
                onClick={confirmDeleteBill}
              >
                {deleting ? 'Deleting...' : 'Delete Bill'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {generatedBill ? (
        <div
          className="billing-modal-overlay billing-invoice-overlay"
          onClick={() => setGeneratedBill(null)}
          role="presentation"
        >
          <div
            className="billing-modal billing-invoice-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bill-success-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="billing-modal-head no-print">
              <div>
                <h2 id="bill-success-title">Invoice Ready</h2>
                <p>Preview matches printer format · {generatedBill.billNo}</p>
              </div>
              <button
                type="button"
                className="billing-modal-close"
                aria-label="Close"
                onClick={() => setGeneratedBill(null)}
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="billing-invoice-scroll">
              <BillInvoice
                bill={generatedBill}
                company={company}
                cashierName={user?.fullName || ''}
              />
            </div>

            <div className="billing-invoice-actions no-print">
              <button
                type="button"
                className="billing-print-btn"
                onClick={printInvoice}
              >
                <FiPrinter />
                Print Invoice
              </button>
              <button
                type="button"
                className="billing-generate-btn"
                onClick={() => setGeneratedBill(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
};

export default Billing;
