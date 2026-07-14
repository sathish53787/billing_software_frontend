import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { FiMinus, FiPlus, FiPrinter, FiSearch, FiShoppingCart, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import {
  createBill,
  getCompany,
  getFoodItems,
  getNextBillInfo,
} from '../../Services/apiService';
import AppShell from '../Layout/AppShell';
import '../Dashboard/Dashboard.css';
import BillInvoice from './BillInvoice';
import './Billing.css';

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const todayInputValue = () => new Date().toISOString().slice(0, 10);

const formatCategories = (category) => {
  if (Array.isArray(category)) return category.join(', ');
  return category || '—';
};

const formatDisplayDate = (value) => {
  if (!value) return '—';
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [year, month, day] = raw.slice(0, 10).split('-');
    return `${day}-${month}-${year}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return raw;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const Billing = () => {
  const user = useSelector((state) => state.auth?.user);
  const [foodItems, setFoodItems] = useState([]);
  const [company, setCompany] = useState(null);
  const [cart, setCart] = useState({});
  const [search, setSearch] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [billDate] = useState(todayInputValue);
  const [billNo, setBillNo] = useState('—');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatedBill, setGeneratedBill] = useState(null);

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

  const cartLines = useMemo(() => {
    return Object.values(cart).map((line) => {
      const quantity = Number(line.quantity);
      const safeQty = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
      const subtotal = round2(line.price * safeQty);
      const gstAmount = round2((subtotal * line.gstPercent) / 100);
      const lineTotal = round2(subtotal + gstAmount);
      return { ...line, quantity: line.quantity, safeQty, subtotal, gstAmount, lineTotal };
    });
  }, [cart]);

  const totals = useMemo(() => {
    const subtotal = round2(cartLines.reduce((sum, line) => sum + line.subtotal, 0));
    const totalGst = round2(cartLines.reduce((sum, line) => sum + line.gstAmount, 0));
    const grandTotal = round2(subtotal + totalGst);
    const itemCount = cartLines.reduce((sum, line) => sum + (line.safeQty || 0), 0);
    return { subtotal, totalGst, grandTotal, itemCount };
  }, [cartLines]);

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
      const data = await createBill({
        customerName: customerName.trim(),
        billDate,
        status: 'Paid',
        items: billItems,
      });

      if (!data?.success) {
        toast.error(data?.message || 'Failed to generate bill');
        return;
      }

      setGeneratedBill(data.bill);
      clearCart();
      setCustomerName('');
      await loadNextBillInfo();
      toast.success(data.message || 'Bill generated successfully');
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error.message || 'Failed to generate bill'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Billing" subtitle="Select items, set quantity, and generate bill">
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
          <p className="billing-meta-value">{billNo}</p>
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
                <h2>Current Bill</h2>
                <p>{totals.itemCount} item(s) selected</p>
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
            {saving ? 'Generating...' : 'Generate Bill'}
          </button>
        </aside>
      </div>

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
