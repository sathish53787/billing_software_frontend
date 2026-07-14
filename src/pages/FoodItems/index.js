import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiChevronDown, FiEdit2, FiPlus, FiSearch, FiTrash2, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import {
  createFoodItem,
  deleteFoodItem,
  getFoodItems,
  updateFoodItem,
} from '../../Services/apiService';
import AppShell from '../Layout/AppShell';
import '../Dashboard/Dashboard.css';
import './FoodItems.css';

const CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
const TYPES = ['Veg', 'Non-Veg'];

const emptyForm = {
  itemName: '',
  category: [],
  type: '',
  price: '',
  gstPercent: '',
  available: true,
};

const emptyStats = {
  vegItems: 0,
  nonVegItems: 0,
  totalItems: 0,
  availableCount: 0,
};

const emptyFilters = {
  search: '',
  type: '',
  category: '',
  available: '',
};

const formatCategories = (category) => {
  if (Array.isArray(category)) return category;
  return category ? [category] : [];
};

const itemHasCategory = (itemCategory, filterCategory) => {
  if (!filterCategory) return true;
  if (Array.isArray(itemCategory)) return itemCategory.includes(filterCategory);
  return itemCategory === filterCategory;
};

const FoodItems = () => {
  const categoryRef = useRef(null);
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(emptyStats);
  const [filters, setFilters] = useState(emptyFilters);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  const filteredItems = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !search || String(item.itemName || '').toLowerCase().includes(search);
      const matchesType = !filters.type || item.type === filters.type;
      const matchesCategory = itemHasCategory(item.category, filters.category);
      const matchesAvailable =
        !filters.available ||
        (filters.available === 'yes' && item.available) ||
        (filters.available === 'no' && !item.available);

      return matchesSearch && matchesType && matchesCategory && matchesAvailable;
    });
  }, [items, filters]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await getFoodItems();
      if (!data?.success) {
        toast.error(data?.message || 'Failed to load food items');
        return;
      }
      setItems(data.items || []);
      setStats(data.stats || emptyStats);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error.message || 'Failed to load food items'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    if (!modalOpen && !deleteTarget) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      if (categoryOpen) {
        setCategoryOpen(false);
        return;
      }
      if (modalOpen) closeModal();
      if (deleteTarget) setDeleteTarget(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [modalOpen, categoryOpen, deleteTarget]);

  useEffect(() => {
    if (!categoryOpen) return undefined;
    const onPointerDown = (event) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target)) {
        setCategoryOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [categoryOpen]);

  const onFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => setFilters(emptyFilters);

  const openAddModal = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setErrors({});
    setCategoryOpen(false);
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setForm({
      itemName: item.itemName || '',
      category: formatCategories(item.category),
      type: item.type || '',
      price: item.price ?? '',
      gstPercent: item.gstPercent ?? '',
      available: Boolean(item.available),
    });
    setErrors({});
    setCategoryOpen(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    setCategoryOpen(false);
  };

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const toggleCategory = (category) => {
    setForm((prev) => {
      const selected = prev.category.includes(category)
        ? prev.category.filter((item) => item !== category)
        : [...prev.category, category];
      return { ...prev, category: selected };
    });
    setErrors((prev) => ({ ...prev, category: '' }));
  };

  const validate = () => {
    const next = {};
    if (!form.itemName.trim()) next.itemName = 'Item name is required';
    if (!form.category.length) next.category = 'Select at least one category';
    if (!form.type) next.type = 'Type is required';
    if (form.price === '' || Number.isNaN(Number(form.price)) || Number(form.price) < 0) {
      next.price = 'Enter a valid price';
    }
    if (
      form.gstPercent !== '' &&
      (Number.isNaN(Number(form.gstPercent)) ||
        Number(form.gstPercent) < 0 ||
        Number(form.gstPercent) > 100)
    ) {
      next.gstPercent = 'GST % must be between 0 and 100';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      itemName: form.itemName.trim(),
      category: form.category,
      type: form.type,
      price: Number(form.price),
      gstPercent: form.gstPercent === '' ? 0 : Number(form.gstPercent),
      available: form.available,
    };

    setSaving(true);
    try {
      const data = editingItem
        ? await updateFoodItem(editingItem._id, payload)
        : await createFoodItem(payload);

      if (!data?.success) {
        toast.error(
          data?.message ||
            (editingItem ? 'Failed to update food item' : 'Failed to add food item')
        );
        return;
      }

      setItems(data.items || []);
      setStats(data.stats || emptyStats);
      toast.success(
        data.message ||
          (editingItem ? 'Food item updated successfully' : 'Food item added successfully')
      );
      closeModal();
      setForm(emptyForm);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          (editingItem ? 'Failed to update food item' : 'Failed to add food item')
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?._id) return;

    setDeleting(true);
    try {
      const data = await deleteFoodItem(deleteTarget._id);
      if (!data?.success) {
        toast.error(data?.message || 'Failed to delete food item');
        return;
      }

      setItems(data.items || []);
      setStats(data.stats || emptyStats);
      if (selectedId === deleteTarget._id) setSelectedId(null);
      toast.success(data.message || 'Food item deleted successfully');
      setDeleteTarget(null);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error.message || 'Failed to delete food item'
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell title="Food Items" subtitle="Manage your menu items">
      <section className="dash-kpi-row food-kpi-row" aria-label="Food item summary">
        <article className="dash-kpi food-kpi food-kpi-veg">
          <p className="dash-kpi-label">Veg Items</p>
          <p className="dash-kpi-value">{stats.vegItems}</p>
        </article>
        <article className="dash-kpi food-kpi food-kpi-nonveg">
          <p className="dash-kpi-label">Non-Veg Items</p>
          <p className="dash-kpi-value">{stats.nonVegItems}</p>
        </article>
        <article className="dash-kpi food-kpi food-kpi-total">
          <p className="dash-kpi-label">Total Items</p>
          <p className="dash-kpi-value">{stats.totalItems}</p>
        </article>
        <article className="dash-kpi food-kpi food-kpi-available">
          <p className="dash-kpi-label">Available Count</p>
          <p className="dash-kpi-value">{stats.availableCount}</p>
        </article>
      </section>

      <div className="dash-panel food-panel">
        <div className="food-panel-head">
          <h2>Menu Items</h2>
          <button type="button" className="food-add-btn" onClick={openAddModal}>
            <FiPlus />
            Add
          </button>
        </div>

        <div className="food-filters">
          <div className="food-search">
            <FiSearch />
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={onFilterChange}
              placeholder="Search item name"
            />
          </div>

          <select name="type" value={filters.type} onChange={onFilterChange}>
            <option value="">All Types</option>
            {TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <select name="category" value={filters.category} onChange={onFilterChange}>
            <option value="">All Categories</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select name="available" value={filters.available} onChange={onFilterChange}>
            <option value="">All Availability</option>
            <option value="yes">Available</option>
            <option value="no">Not Available</option>
          </select>

          <button type="button" className="food-clear-btn" onClick={clearFilters}>
            Clear
          </button>
        </div>

        <div className="food-table-wrap">
          {loading ? (
            <p className="food-empty">Loading food items...</p>
          ) : filteredItems.length === 0 ? (
            <p className="food-empty">
              {items.length === 0
                ? 'No food items yet. Click Add to create one.'
                : 'No items match your filters.'}
            </p>
          ) : (
            <table className="food-table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Price</th>
                  <th>GST %</th>
                  <th>Available</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, index) => (
                  <tr
                    key={item._id}
                    className={selectedId === item._id ? 'is-selected' : ''}
                    style={{ animationDelay: `${index * 0.04}s` }}
                    onClick={() =>
                      setSelectedId((prev) => (prev === item._id ? null : item._id))
                    }
                  >
                    <td>
                      <span className="food-item-name">{item.itemName}</span>
                    </td>
                    <td>
                      <div className="food-chip-row">
                        {formatCategories(item.category).map((category) => (
                          <span key={category} className="food-chip">
                            {category}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`food-type-badge ${
                          item.type === 'Veg' ? 'is-veg' : 'is-nonveg'
                        }`}
                      >
                        <span className="food-type-dot" />
                        {item.type}
                      </span>
                    </td>
                    <td>
                      <span className="food-price">₹{Number(item.price).toFixed(2)}</span>
                    </td>
                    <td>
                      <span className="food-gst">{item.gstPercent}%</span>
                    </td>
                    <td>
                      <span
                        className={`food-avail-badge ${
                          item.available ? 'is-yes' : 'is-no'
                        }`}
                      >
                        {item.available ? 'Available' : 'Unavailable'}
                      </span>
                    </td>
                    <td>
                      <div className="food-actions">
                        <button
                          type="button"
                          className="food-action-btn is-edit"
                          title="Edit"
                          aria-label={`Edit ${item.itemName}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(item);
                          }}
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          type="button"
                          className="food-action-btn is-delete"
                          title="Delete"
                          aria-label={`Delete ${item.itemName}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(item);
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
        </div>
      </div>

      {modalOpen ? (
        <div className="food-modal-overlay" onClick={closeModal} role="presentation">
          <div
            className="food-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="food-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="food-modal-head">
              <div>
                <h2 id="food-modal-title">
                  {editingItem ? 'Edit Food Item' : 'Add Food Item'}
                </h2>
                <p>
                  {editingItem
                    ? 'Update item details for your menu'
                    : 'Enter item details for your menu'}
                </p>
              </div>
              <button
                type="button"
                className="food-modal-close"
                aria-label="Close"
                onClick={closeModal}
              >
                <FiX size={18} />
              </button>
            </div>

            <form className="food-modal-form" onSubmit={onSubmit}>
              <label htmlFor="itemName">Item Name</label>
              <input
                id="itemName"
                name="itemName"
                value={form.itemName}
                onChange={onChange}
                placeholder="Enter item name"
              />
              {errors.itemName ? <span className="food-error">{errors.itemName}</span> : null}

              <label>Category</label>
              <div className="food-multi-select" ref={categoryRef}>
                <button
                  type="button"
                  className="food-multi-trigger"
                  onClick={() => setCategoryOpen((open) => !open)}
                  aria-haspopup="listbox"
                  aria-expanded={categoryOpen}
                >
                  <span className={form.category.length ? '' : 'is-placeholder'}>
                    {form.category.length
                      ? form.category.join(', ')
                      : 'Select categories'}
                  </span>
                  <FiChevronDown />
                </button>

                {categoryOpen ? (
                  <div className="food-multi-menu" role="listbox" aria-multiselectable="true">
                    {CATEGORIES.map((category) => {
                      const checked = form.category.includes(category);
                      return (
                        <label key={category} className="food-multi-option">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCategory(category)}
                          />
                          <span>{category}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : null}
              </div>
              {errors.category ? <span className="food-error">{errors.category}</span> : null}

              <label htmlFor="type">Type</label>
              <select id="type" name="type" value={form.type} onChange={onChange}>
                <option value="">Select type</option>
                {TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {errors.type ? <span className="food-error">{errors.type}</span> : null}

              <div className="food-modal-row">
                <div>
                  <label htmlFor="price">Price</label>
                  <input
                    id="price"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={onChange}
                    placeholder="0.00"
                  />
                  {errors.price ? <span className="food-error">{errors.price}</span> : null}
                </div>
                <div>
                  <label htmlFor="gstPercent">GST % <span className="food-optional">(optional)</span></label>
                  <input
                    id="gstPercent"
                    name="gstPercent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.gstPercent}
                    onChange={onChange}
                    placeholder="0"
                  />
                  {errors.gstPercent ? (
                    <span className="food-error">{errors.gstPercent}</span>
                  ) : null}
                </div>
              </div>

              <label className="food-check">
                <input
                  type="checkbox"
                  name="available"
                  checked={form.available}
                  onChange={onChange}
                />
                Available
              </label>

              <div className="food-modal-actions">
                <button type="button" className="food-btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="food-btn-primary" disabled={saving}>
                  {saving
                    ? editingItem
                      ? 'Updating...'
                      : 'Saving...'
                    : editingItem
                      ? 'Update Item'
                      : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div
          className="food-modal-overlay"
          onClick={() => setDeleteTarget(null)}
          role="presentation"
        >
          <div
            className="food-modal food-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="food-delete-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="food-modal-head">
              <div>
                <h2 id="food-delete-title">Delete Food Item</h2>
                <p>
                  Are you sure you want to delete{' '}
                  <strong>{deleteTarget.itemName}</strong>? This action cannot be undone.
                </p>
              </div>
              <button
                type="button"
                className="food-modal-close"
                aria-label="Close"
                onClick={() => setDeleteTarget(null)}
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="food-modal-actions">
              <button
                type="button"
                className="food-btn-secondary"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="food-btn-danger"
                disabled={deleting}
                onClick={confirmDelete}
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

export default FoodItems;
