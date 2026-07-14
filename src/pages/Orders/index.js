import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiMinus,
  FiPlus,
  FiPrinter,
  FiSearch,
  FiShoppingCart,
  FiX,
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import {
  cancelOrder,
  createOrder,
  generateBillFromOrder,
  getBillById,
  getCompany,
  getFoodItems,
  getOrders,
  updateOrder,
} from '../../Services/apiService';
import AppShell from '../Layout/AppShell';
import BillInvoice from '../Billing/BillInvoice';
import DateRangePicker from '../../components/DateRangePicker/DateRangePicker';
import '../Dashboard/Dashboard.css';
import '../Billing/Billing.css';
import './Orders.css';

const ORDER_TYPES = ['Dine-In', 'Parcel', 'Delivery'];

const emptyMeta = {
  orderDate: '',
  tableNumber: '',
  guestCount: '',
  captain: '',
  customerName: '',
  mobileNumber: '',
  deliveryAddress: '',
  packingCharge: '',
  deliveryCharge: '',
};

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

const toInputDate = (value) => {
  if (!value) return todayInputValue();
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return todayInputValue();
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

const formatDisplayDate = (value) => {
  if (!value) return '—';
  const input = toInputDate(value);
  const [year, month, day] = input.split('-');
  return `${day}-${month}-${year}`;
};

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const formatCategories = (category) => {
  if (Array.isArray(category)) return category.join(', ');
  return category || '—';
};

const orderLabel = (order) => {
  if (!order) return '';
  if (order.orderType === 'Dine-In') {
    return `Table ${order.tableNumber}${order.guestCount ? ` · ${order.guestCount} guests` : ''}`;
  }
  if (order.orderType === 'Parcel') {
    return order.customerName ? `Parcel — ${order.customerName}` : 'Parcel';
  }
  return order.customerName ? `Delivery — ${order.customerName}` : 'Delivery';
};

const Orders = () => {
  const user = useSelector((state) => state.auth?.user);
  const [orderType, setOrderType] = useState('Dine-In');
  const [meta, setMeta] = useState(() => ({
    ...emptyMeta,
    orderDate: todayInputValue(),
  }));
  const [orders, setOrders] = useState([]);
  const [orderCounts, setOrderCounts] = useState({
    all: 0,
    draft: 0,
    billed: 0,
    cancelled: 0,
    dineIn: 0,
    parcel: 0,
    delivery: 0,
  });
  const [listStatus, setListStatus] = useState('All');
  const [listType, setListType] = useState('All');
  const [fromDate, setFromDate] = useState(() => todayInputValue());
  const [toDate, setToDate] = useState(() => todayInputValue());
  const [listLoading, setListLoading] = useState(false);
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(10);
  const [listTotal, setListTotal] = useState(0);
  const [listTotalPages, setListTotalPages] = useState(1);
  const [activeOrder, setActiveOrder] = useState(null);
  const [foodItems, setFoodItems] = useState([]);
  const [company, setCompany] = useState(null);
  const [cart, setCart] = useState({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatedBill, setGeneratedBill] = useState(null);
  const [addOrderOpen, setAddOrderOpen] = useState(false);
  const [menuPanelOpen, setMenuPanelOpen] = useState(false);

  const loadOrders = useCallback(async () => {
    setListLoading(true);
    try {
      const data = await getOrders({
        status: listStatus,
        orderType: listType,
        from_date: fromDate,
        to_date: toDate || fromDate,
        page: listPage,
        limit: listPageSize,
        count: listPageSize,
      });
      if (data?.success) {
        setOrders(data.orders || []);
        if (data.counts) setOrderCounts(data.counts);
        const pagination = data.pagination || {};
        const total = Number(pagination.total) || 0;
        const totalPages = Math.max(
          1,
          Number(pagination.totalPages) || Math.ceil(total / listPageSize) || 1
        );
        setListTotal(total);
        setListTotalPages(totalPages);
        if (listPage > totalPages) setListPage(totalPages);
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error.message || 'Failed to load orders'
      );
    } finally {
      setListLoading(false);
    }
  }, [listStatus, listType, fromDate, toDate, listPage, listPageSize]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [foodData, companyData] = await Promise.all([
          getFoodItems(),
          getCompany().catch(() => null),
        ]);
        if (!active) return;
        if (!foodData?.success) {
          toast.error(foodData?.message || 'Failed to load food items');
          return;
        }
        setFoodItems((foodData.items || []).filter((item) => item.available));
        if (companyData?.success) setCompany(companyData.company || null);
      } catch (error) {
        if (!active) return;
        toast.error(error?.response?.data?.message || error.message || 'Failed to load');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    setListPage(1);
  }, [listStatus, listType, fromDate, toDate, listPageSize]);

  const listPagination = useMemo(() => {
    const start = listTotal === 0 ? 0 : (listPage - 1) * listPageSize + 1;
    const end = Math.min(listPage * listPageSize, listTotal);
    return {
      total: listTotal,
      totalPages: listTotalPages,
      start,
      end,
    };
  }, [listTotal, listTotalPages, listPage, listPageSize]);

  const syncCartFromOrder = (order) => {
    const next = {};
    (order?.items || []).forEach((item) => {
      next[String(item.foodItemId)] = {
        foodItemId: item.foodItemId,
        itemName: item.itemName,
        type: item.type,
        category: item.category,
        price: item.price,
        gstPercent: item.gstPercent,
        quantity: item.quantity,
        note: item.note || '',
      };
    });
    setCart(next);
  };

  const openDraft = (order) => {
    if (order.status !== 'Draft') {
      toast.info('Only draft orders can be edited');
      return;
    }
    setActiveOrder(order);
    setMenuPanelOpen(true);
    setOrderType(order.orderType);
    setMeta({
      orderDate: toInputDate(order.orderDate || order.createdAt),
      tableNumber: order.tableNumber || '',
      guestCount: order.guestCount || '',
      captain: order.captain || '',
      customerName: order.customerName || '',
      mobileNumber: order.mobileNumber || '',
      deliveryAddress: order.deliveryAddress || '',
      packingCharge: order.packingCharge || '',
      deliveryCharge: order.deliveryCharge || '',
    });
    syncCartFromOrder(order);
  };

  const toggleMenuPanel = () => {
    if (!activeOrder) {
      toast.info('Open a draft order first');
      return;
    }
    setMenuPanelOpen((prev) => !prev);
  };

  const viewBill = async (order) => {
    if (!order.billId) {
      toast.error('Bill not found for this order');
      return;
    }
    try {
      const data = await getBillById(order.billId);
      if (!data?.success || !data.bill) {
        toast.error(data?.message || 'Failed to load bill');
        return;
      }
      setGeneratedBill(data.bill);
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || 'Failed to load bill');
    }
  };

  const cartLines = useMemo(() => {
    return Object.values(cart).map((line) => {
      const quantity = Number(line.quantity);
      const safeQty = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
      const subtotal = round2(line.price * safeQty);
      const gstAmount = round2((subtotal * (line.gstPercent || 0)) / 100);
      const lineTotal = round2(subtotal + gstAmount);
      return { ...line, safeQty, subtotal, gstAmount, lineTotal };
    });
  }, [cart]);

  const extraCharge = useMemo(() => {
    if (orderType === 'Parcel') return round2(Number(meta.packingCharge) || 0);
    if (orderType === 'Delivery') return round2(Number(meta.deliveryCharge) || 0);
    return 0;
  }, [orderType, meta.packingCharge, meta.deliveryCharge]);

  const totals = useMemo(() => {
    const subtotal = round2(cartLines.reduce((sum, line) => sum + line.subtotal, 0));
    const totalGst = round2(cartLines.reduce((sum, line) => sum + line.gstAmount, 0));
    const grandTotal = round2(subtotal + totalGst + extraCharge);
    const itemCount = cartLines.reduce((sum, line) => sum + (line.safeQty || 0), 0);
    return { subtotal, totalGst, grandTotal, itemCount, extraCharge };
  }, [cartLines, extraCharge]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return foodItems;
    return foodItems.filter((item) =>
      String(item.itemName || '').toLowerCase().includes(q)
    );
  }, [foodItems, search]);

  const onMetaChange = (e) => {
    const { name, value } = e.target;
    setMeta((prev) => ({ ...prev, [name]: value }));
  };

  const beginNewOrderForm = (type = orderType) => {
    setOrderType(type);
    setMeta({ ...emptyMeta, orderDate: todayInputValue() });
    setActiveOrder(null);
    setCart({});
    setMenuPanelOpen(false);
  };

  const openAddOrderPopup = () => {
    setOrderType('Dine-In');
    setMeta({ ...emptyMeta, orderDate: todayInputValue() });
    setAddOrderOpen(true);
  };

  const closeAddOrderPopup = () => {
    setAddOrderOpen(false);
  };

  const showDraftsOnly = () => {
    setListStatus('Draft');
    setListType('All');
  };

  const setPopupOrderType = (type) => {
    setOrderType(type);
    setMeta((prev) => ({
      ...emptyMeta,
      orderDate: prev.orderDate || todayInputValue(),
    }));
  };

  const startOrder = async (e) => {
    e.preventDefault();
    setStarting(true);
    try {
      const payload = {
        orderType,
        orderDate: meta.orderDate || todayInputValue(),
        tableNumber: meta.tableNumber,
        guestCount: meta.guestCount === '' ? 0 : Number(meta.guestCount),
        captain: meta.captain,
        customerName: meta.customerName,
        mobileNumber: meta.mobileNumber,
        deliveryAddress: meta.deliveryAddress,
        packingCharge: meta.packingCharge === '' ? 0 : Number(meta.packingCharge),
        deliveryCharge: meta.deliveryCharge === '' ? 0 : Number(meta.deliveryCharge),
      };
      const data = await createOrder(payload);
      if (!data?.success) {
        toast.error(data?.message || 'Failed to start order');
        return;
      }
      openDraft(data.order);
      setAddOrderOpen(false);
      await loadOrders();
      toast.success(
        data.resumed
          ? 'Opened existing draft for this table'
          : `${orderType} draft created — add food items`
      );
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || 'Failed to start order');
    } finally {
      setStarting(false);
    }
  };

  const onCancelDraftById = async (orderId) => {
    if (!orderId) return;
    try {
      const data = await cancelOrder(orderId);
      if (!data?.success) {
        toast.error(data?.message || 'Failed to cancel order');
        return;
      }
      if (activeOrder?._id === orderId) {
        setActiveOrder(null);
        setCart({});
        setMenuPanelOpen(false);
        setMeta({ ...emptyMeta, orderDate: todayInputValue() });
      }
      await loadOrders();
      toast.success('Draft cancelled');
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || 'Failed to cancel');
    }
  };

  const onCancelDraft = async () => {
    if (!activeOrder?._id) return;
    await onCancelDraftById(activeOrder._id);
  };

  const persistItems = async (nextCart) => {
    if (!activeOrder?._id) return null;
    const items = Object.values(nextCart)
      .filter((line) => Number(line.quantity) >= 1)
      .map((line) => ({
        foodItemId: line.foodItemId,
        quantity: Number(line.quantity),
        note: line.note || '',
      }));

    const data = await updateOrder(activeOrder._id, {
      orderType,
      orderDate: meta.orderDate || todayInputValue(),
      tableNumber: meta.tableNumber,
      guestCount: meta.guestCount === '' ? 0 : Number(meta.guestCount),
      captain: meta.captain,
      customerName: meta.customerName,
      mobileNumber: meta.mobileNumber,
      deliveryAddress: meta.deliveryAddress,
      packingCharge: meta.packingCharge === '' ? 0 : Number(meta.packingCharge),
      deliveryCharge: meta.deliveryCharge === '' ? 0 : Number(meta.deliveryCharge),
      items,
    });

    if (!data?.success) {
      throw new Error(data?.message || 'Failed to save order items');
    }
    setActiveOrder(data.order);
    await loadOrders();
    return data.order;
  };

  const addToCart = (item) => {
    if (!activeOrder) {
      toast.info('Open a draft order first');
      return;
    }
    const next = {
      ...cart,
      [item._id]: {
        foodItemId: item._id,
        itemName: item.itemName,
        type: item.type,
        category: item.category,
        price: item.price,
        gstPercent: item.gstPercent,
        quantity: cart[item._id] ? Number(cart[item._id].quantity) + 1 : 1,
        note: cart[item._id]?.note || '',
      },
    };
    setCart(next);
  };

  const updateQuantity = (foodItemId, nextQty) => {
    const next = { ...cart };
    if (nextQty < 1) delete next[foodItemId];
    else if (next[foodItemId]) next[foodItemId] = { ...next[foodItemId], quantity: nextQty };
    setCart(next);
  };

  const saveDraftAndClose = async () => {
    if (!activeOrder?._id) {
      toast.error('No draft order selected');
      return;
    }
    if (!cartLines.some((line) => line.safeQty >= 1)) {
      toast.error('Add at least one food item');
      return;
    }
    setSaving(true);
    try {
      await persistItems(cart);
      toast.success('Draft saved');
      setMenuPanelOpen(false);
      setActiveOrder(null);
      setCart({});
      setMeta({ ...emptyMeta, orderDate: todayInputValue() });
      await loadOrders();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error.message || 'Failed to save draft'
      );
    } finally {
      setSaving(false);
    }
  };

  const generateBill = async () => {
    if (!activeOrder?._id) {
      toast.error('Start an order first');
      return;
    }
    if (!cartLines.some((line) => line.safeQty >= 1)) {
      toast.error('Add at least one food item');
      return;
    }

    setSaving(true);
    try {
      await persistItems(cart);
      const data = await generateBillFromOrder(activeOrder._id);
      if (!data?.success) {
        toast.error(data?.message || 'Failed to generate bill');
        return;
      }
      setGeneratedBill(data.bill);
      setActiveOrder(null);
      setCart({});
      setMenuPanelOpen(false);
      setMeta({ ...emptyMeta, orderDate: todayInputValue() });
      await loadOrders();
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
    <AppShell
      title="Orders"
      subtitle="Dine-In, Parcel & Delivery — draft orders, then generate bill"
    >
      <div className="orders-summary-cards" aria-label="Order filters">
        {[
          { key: 'All', label: 'All', value: orderCounts.all, tone: 'all' },
          { key: 'Draft', label: 'Draft', value: orderCounts.draft, tone: 'draft' },
          { key: 'Billed', label: 'Billed', value: orderCounts.billed, tone: 'billed' },
          {
            key: 'Dine-In',
            label: 'Dine-In',
            value: orderCounts.dineIn,
            tone: 'dine-in',
            isType: true,
          },
          {
            key: 'Parcel',
            label: 'Parcel',
            value: orderCounts.parcel,
            tone: 'parcel',
            isType: true,
          },
          {
            key: 'Delivery',
            label: 'Delivery',
            value: orderCounts.delivery,
            tone: 'delivery',
            isType: true,
          },
        ].map((card) => {
          const isActive =
            (card.isType ? listType : listStatus) === card.key ||
            (!card.isType &&
              card.key === 'All' &&
              listStatus === 'All' &&
              listType === 'All');
          return (
            <button
              key={card.key}
              type="button"
              className={`orders-summary-card is-${card.tone}${isActive ? ' is-active' : ''}`}
              onClick={() => {
                setMenuPanelOpen(false);
                if (card.isType) {
                  setListType(card.key);
                  setListStatus('All');
                } else if (card.key === 'All') {
                  setListStatus('All');
                  setListType('All');
                } else {
                  setListStatus(card.key);
                  setListType('All');
                }
              }}
            >
              <span className="orders-summary-label">{card.label}</span>
              <span className="orders-summary-value">{card.value}</span>
            </button>
          );
        })}
      </div>

      <div className="orders-toolbar">
        {activeOrder ? (
          <div className="orders-active-badge">
            Editing: {activeOrder.orderNo} · {orderLabel(activeOrder)}
            <button
              type="button"
              className="orders-link-btn"
              onClick={() => beginNewOrderForm(orderType)}
            >
              Close
            </button>
          </div>
        ) : null}
        <div className="orders-toolbar-actions">
          {activeOrder ? (
            <button
              type="button"
              className={`orders-chip-btn${menuPanelOpen ? ' is-active' : ''}`}
              onClick={toggleMenuPanel}
            >
              Food Menu
            </button>
          ) : null}
          <button type="button" className="orders-start-btn" onClick={openAddOrderPopup}>
            <FiPlus size={16} />
            Add Order
          </button>
          <button
            type="button"
            className={`orders-chip-btn${listStatus === 'Draft' ? ' is-active' : ''}`}
            onClick={showDraftsOnly}
          >
            Draft ({orderCounts.draft})
          </button>
        </div>
      </div>

      {addOrderOpen ? (
        <div
          className="orders-modal-overlay"
          onClick={closeAddOrderPopup}
          role="presentation"
        >
          <div
            className="orders-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-order-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="orders-modal-head">
              <div>
                <h2 id="add-order-title">Add Order</h2>
                <p>Choose type and enter details to start a draft</p>
              </div>
              <button
                type="button"
                className="orders-modal-close"
                aria-label="Close"
                onClick={closeAddOrderPopup}
              >
                <FiX size={18} />
              </button>
            </div>

            <form className="orders-meta-form" onSubmit={startOrder}>
              <div className="orders-field">
                <label htmlFor="popupOrderType">Order Type</label>
                <select
                  id="popupOrderType"
                  value={orderType}
                  onChange={(e) => setPopupOrderType(e.target.value)}
                >
                  {ORDER_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="orders-field">
                <label htmlFor="orderDate">Order Date</label>
                <input
                  id="orderDate"
                  name="orderDate"
                  type="date"
                  value={meta.orderDate || todayInputValue()}
                  onChange={onMetaChange}
                />
              </div>

              {orderType === 'Dine-In' ? (
                <>
                  <div className="orders-field">
                    <label htmlFor="tableNumber">Table Number *</label>
                    <input
                      id="tableNumber"
                      name="tableNumber"
                      value={meta.tableNumber}
                      onChange={onMetaChange}
                      placeholder="e.g. 7"
                      required
                    />
                  </div>
                  <div className="orders-field">
                    <label htmlFor="guestCount">Guest Count</label>
                    <input
                      id="guestCount"
                      name="guestCount"
                      type="number"
                      min="0"
                      value={meta.guestCount}
                      onChange={onMetaChange}
                      placeholder="0"
                    />
                  </div>
                  <div className="orders-field">
                    <label htmlFor="captain">Captain (Optional)</label>
                    <input
                      id="captain"
                      name="captain"
                      value={meta.captain}
                      onChange={onMetaChange}
                      placeholder="Captain name"
                    />
                  </div>
                </>
              ) : null}

              {orderType === 'Parcel' ? (
                <>
                  <div className="orders-field">
                    <label htmlFor="customerName">Customer Name</label>
                    <input
                      id="customerName"
                      name="customerName"
                      value={meta.customerName}
                      onChange={onMetaChange}
                      placeholder="Customer name"
                    />
                  </div>
                  <div className="orders-field">
                    <label htmlFor="mobileNumber">Mobile Number</label>
                    <input
                      id="mobileNumber"
                      name="mobileNumber"
                      value={meta.mobileNumber}
                      onChange={onMetaChange}
                      placeholder="10-digit mobile"
                    />
                  </div>
                  <div className="orders-field">
                    <label htmlFor="packingCharge">Packing Charge</label>
                    <input
                      id="packingCharge"
                      name="packingCharge"
                      type="number"
                      min="0"
                      step="0.01"
                      value={meta.packingCharge}
                      onChange={onMetaChange}
                      placeholder="0.00"
                    />
                  </div>
                </>
              ) : null}

              {orderType === 'Delivery' ? (
                <>
                  <div className="orders-field">
                    <label htmlFor="customerNameDel">Customer Name *</label>
                    <input
                      id="customerNameDel"
                      name="customerName"
                      value={meta.customerName}
                      onChange={onMetaChange}
                      placeholder="Customer name"
                      required
                    />
                  </div>
                  <div className="orders-field">
                    <label htmlFor="mobileNumberDel">Mobile Number *</label>
                    <input
                      id="mobileNumberDel"
                      name="mobileNumber"
                      value={meta.mobileNumber}
                      onChange={onMetaChange}
                      placeholder="10-digit mobile"
                      required
                    />
                  </div>
                  <div className="orders-field orders-field-wide">
                    <label htmlFor="deliveryAddress">Delivery Address *</label>
                    <input
                      id="deliveryAddress"
                      name="deliveryAddress"
                      value={meta.deliveryAddress}
                      onChange={onMetaChange}
                      placeholder="Full delivery address"
                      required
                    />
                  </div>
                  <div className="orders-field">
                    <label htmlFor="deliveryCharge">Delivery Charge</label>
                    <input
                      id="deliveryCharge"
                      name="deliveryCharge"
                      type="number"
                      min="0"
                      step="0.01"
                      value={meta.deliveryCharge}
                      onChange={onMetaChange}
                      placeholder="0.00"
                    />
                  </div>
                </>
              ) : null}

              <div className="orders-form-actions">
                <button
                  type="button"
                  className="orders-chip-btn"
                  onClick={closeAddOrderPopup}
                >
                  Cancel
                </button>
                <button type="submit" className="orders-start-btn" disabled={starting}>
                  {starting ? 'Starting...' : `Start ${orderType}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <section className="dash-panel orders-drafts">
        <form
          className="orders-list-filters"
          onSubmit={(e) => {
            e.preventDefault();
            loadOrders();
          }}
        >
          <DateRangePicker
            id="ordersDateRange"
            label="Select Date"
            fromDate={fromDate}
            toDate={toDate}
            onChange={({ fromDate: nextFrom, toDate: nextTo }) => {
              setFromDate(nextFrom);
              setToDate(nextTo);
            }}
          />
          <div className="orders-field">
            <label htmlFor="listType">Order Type</label>
            <select
              id="listType"
              value={listType}
              onChange={(e) => setListType(e.target.value)}
            >
              <option value="All">All Types</option>
              {ORDER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="orders-field">
            <label htmlFor="listStatus">Status</label>
            <select
              id="listStatus"
              value={listStatus}
              onChange={(e) => setListStatus(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="Draft">Draft</option>
              <option value="Billed">Billed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <button type="submit" className="orders-start-btn" disabled={listLoading}>
            {listLoading ? 'Searching...' : 'Search'}
          </button>
        </form>

        <div className="orders-table-wrap">
          {listLoading ? (
            <p className="orders-empty">Loading orders...</p>
          ) : orders.length === 0 ? (
            <p className="orders-empty">No orders found for selected filters.</p>
          ) : (
            <>
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Order No</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Details</th>
                    <th>Items</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Bill No</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, index) => (
                    <tr
                      key={order._id}
                      className={`${activeOrder?._id === order._id ? 'is-selected' : ''}${
                        order.status === 'Draft' ? ' is-clickable' : ''
                      }`}
                      style={{ animationDelay: `${index * 0.04}s` }}
                      onClick={() => {
                        if (order.status === 'Draft') openDraft(order);
                      }}
                    >
                      <td>
                        <span className="orders-order-no">{order.orderNo}</span>
                      </td>
                      <td>{formatDisplayDate(order.orderDate || order.createdAt)}</td>
                      <td>
                        <span
                          className={`orders-type-pill is-${String(order.orderType || '')
                            .toLowerCase()
                            .replace(/\s+/g, '-')}`}
                        >
                          {order.orderType}
                        </span>
                      </td>
                      <td>{orderLabel(order)}</td>
                      <td>{order.itemCount || 0}</td>
                      <td>
                        <span className="orders-amount">
                          ₹{Number(order.grandTotal || 0).toFixed(2)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`orders-status-pill is-${String(order.status || '')
                            .toLowerCase()}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td>{order.billNo || '—'}</td>
                      <td>
                        <div className="orders-row-actions">
                          {order.status === 'Draft' ? (
                            <>
                              <button
                                type="button"
                                className="orders-link-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDraft(order);
                                }}
                              >
                                Open
                              </button>
                              <button
                                type="button"
                                className="orders-link-btn is-danger"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCancelDraftById(order._id);
                                }}
                              >
                                Cancel
                              </button>
                            </>
                          ) : null}
                          {order.status === 'Billed' ? (
                            <button
                              type="button"
                              className="orders-link-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                viewBill(order);
                              }}
                            >
                              View Bill
                            </button>
                          ) : null}
                          {order.status === 'Cancelled' ? <span>—</span> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="orders-pagination">
                <div className="orders-pagination-info">
                  Showing {listPagination.start}–{listPagination.end} of{' '}
                  {listPagination.total}
                </div>
                <div className="orders-pagination-controls">
                  <label className="orders-page-size" htmlFor="ordersPageSize">
                    Rows
                    <select
                      id="ordersPageSize"
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
                    className="orders-page-btn"
                    disabled={listPage <= 1}
                    onClick={() => setListPage((p) => Math.max(1, p - 1))}
                    aria-label="Previous page"
                  >
                    <FiChevronLeft size={16} />
                  </button>
                  <span className="orders-page-indicator">
                    {listPage} / {listPagination.totalPages}
                  </span>
                  <button
                    type="button"
                    className="orders-page-btn"
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
            </>
          )}
        </div>
      </section>

      {activeOrder && menuPanelOpen ? (
      <div className="billing-layout">
        <section className="dash-panel billing-menu">
          <div className="billing-menu-head">
            <div>
              <h2>Food Menu</h2>
              {activeOrder ? (
                <p className="orders-menu-order-meta">
                  <span className="orders-order-no">{activeOrder.orderNo}</span>
                  <span className="orders-menu-order-sep">·</span>
                  <span>{orderLabel(activeOrder)}</span>
                </p>
              ) : (
                <p>Add items to the draft order anytime</p>
              )}
            </div>
            <div className="orders-menu-head-actions">
              {activeOrder && cartLines.length > 0 ? (
                <button
                  type="button"
                  className="orders-save-draft-btn"
                  title="Save draft and return to table"
                  aria-label="Save draft and return to table"
                  disabled={saving}
                  onClick={saveDraftAndClose}
                >
                  <FiCheck size={18} />
                </button>
              ) : null}
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
          </div>

          {loading ? (
            <p className="billing-empty">Loading menu...</p>
          ) : filteredItems.length === 0 ? (
            <p className="billing-empty">No available food items.</p>
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
                      <span className="billing-price">
                        ₹{Number(item.price).toFixed(2)}
                      </span>
                    </div>
                    <div className="billing-food-foot">
                      <span className="billing-gst">GST {item.gstPercent || 0}%</span>
                      {inCart ? (
                        <div className="billing-qty">
                          <button
                            type="button"
                            aria-label="Decrease"
                            onClick={() =>
                              updateQuantity(item._id, Number(inCart.quantity) - 1)
                            }
                          >
                            <FiMinus />
                          </button>
                          <span className="billing-qty-input">{inCart.quantity}</span>
                          <button
                            type="button"
                            aria-label="Increase"
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
                <h2>Current Order</h2>
                <p>{totals.itemCount} item(s) · Draft</p>
              </div>
            </div>
            <div className="orders-cart-head-actions">
              {activeOrder ? (
                <button type="button" className="billing-clear" onClick={onCancelDraft}>
                  Cancel
                </button>
              ) : null}
            </div>
          </div>

          <div className="billing-cart-list">
            {cartLines.length === 0 ? (
              <p className="billing-empty">Add food items to this draft.</p>
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
                        onClick={() =>
                          updateQuantity(line.foodItemId, Number(line.quantity) - 1)
                        }
                      >
                        <FiMinus />
                      </button>
                      <span className="billing-qty-input">{line.quantity}</span>
                      <button
                        type="button"
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
            {orderType === 'Parcel' ? (
              <div>
                <span>Packing</span>
                <strong>₹{totals.extraCharge.toFixed(2)}</strong>
              </div>
            ) : null}
            {orderType === 'Delivery' ? (
              <div>
                <span>Delivery</span>
                <strong>₹{totals.extraCharge.toFixed(2)}</strong>
              </div>
            ) : null}
            <div className="billing-grand">
              <span>Grand Total</span>
              <strong>₹{totals.grandTotal.toFixed(2)}</strong>
            </div>
          </div>

          <button
            type="button"
            className="billing-generate-btn"
            disabled={saving || !activeOrder || !cartLines.length}
            onClick={generateBill}
          >
            {saving ? 'Generating...' : 'Generate Bill'}
          </button>
        </aside>
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
            onClick={(e) => e.stopPropagation()}
          >
            <div className="billing-modal-head no-print">
              <div>
                <h2>Invoice Ready</h2>
                <p>
                  {generatedBill.billNo}
                  {generatedBill.orderType ? ` · ${generatedBill.orderType}` : ''}
                </p>
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
                onClick={() => window.print()}
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

export default Orders;
