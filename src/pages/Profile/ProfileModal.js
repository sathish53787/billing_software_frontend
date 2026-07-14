import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiCamera, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { persistAuth, updateProfile } from '../../Services/apiService';
import './ProfileModal.css';

const getInitials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'ST';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const ProfileModal = ({ open, user, onClose, onUpdated }) => {
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const initials = useMemo(
    () => getInitials(form.fullName || user?.fullName || 'Admin'),
    [form.fullName, user?.fullName]
  );

  useEffect(() => {
    if (!open) return;
    setForm({
      fullName: user?.fullName || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
    setErrors({});
    setImageFile(null);
    setPreviewUrl(user?.profileImage || '');
  }, [open, user]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!open) return null;

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const onPickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    if (previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setErrors((prev) => ({ ...prev, profileImage: '' }));
  };

  const validate = () => {
    const next = {};
    if (!form.fullName.trim()) next.fullName = 'Full name is required';
    if (!form.email.trim()) next.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = 'Enter a valid email';
    }
    if (!form.phone.trim()) next.phone = 'Phone number is required';
    else if (!/^(\+\d{1,3}[- ]?)?\d{10}$/.test(String(form.phone).replace(/\s/g, ''))) {
      next.phone = 'Enter a valid phone number';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const data = await updateProfile(
        {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: String(form.phone).replace(/\s/g, '').trim(),
        },
        imageFile
      );

      if (!data?.success) {
        toast.error(data?.message || 'Failed to update profile');
        return;
      }

      persistAuth(data.userResponse);
      toast.success(data.message || 'Profile updated successfully');
      onUpdated?.(data.userResponse);
      onClose();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error.message || 'Failed to update profile'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="profile-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="profile-modal-head">
          <div>
            <h2 id="profile-modal-title">My Profile</h2>
            <p>Update your personal details</p>
          </div>
          <button
            type="button"
            className="profile-modal-close"
            aria-label="Close"
            onClick={onClose}
          >
            <FiX size={18} />
          </button>
        </div>

        <form className="profile-modal-form" onSubmit={onSubmit}>
          <div className="profile-upload">
            <div className="profile-upload-avatar">
              {previewUrl ? (
                <img src={previewUrl} alt="Profile preview" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="profile-upload-meta">
              <p className="profile-upload-title">Profile photo</p>
              <p className="profile-upload-hint">JPG, PNG or WEBP up to 5MB</p>
              <button
                type="button"
                className="profile-upload-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                <FiCamera />
                Upload
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                hidden
                onChange={onPickImage}
              />
            </div>
          </div>

          <label className="profile-field-label" htmlFor="profile-fullName">
            Full Name
          </label>
          <input
            id="profile-fullName"
            name="fullName"
            type="text"
            value={form.fullName}
            onChange={onChange}
            placeholder="Enter full name"
            autoComplete="name"
          />
          {errors.fullName ? <span className="profile-field-error">{errors.fullName}</span> : null}

          <label className="profile-field-label" htmlFor="profile-email">
            Email
          </label>
          <input
            id="profile-email"
            name="email"
            type="email"
            value={form.email}
            onChange={onChange}
            placeholder="Enter email"
            autoComplete="email"
          />
          {errors.email ? <span className="profile-field-error">{errors.email}</span> : null}

          <label className="profile-field-label" htmlFor="profile-phone">
            Phone No
          </label>
          <input
            id="profile-phone"
            name="phone"
            type="tel"
            value={form.phone}
            onChange={onChange}
            placeholder="Enter phone number"
            autoComplete="tel"
          />
          {errors.phone ? <span className="profile-field-error">{errors.phone}</span> : null}

          <div className="profile-modal-actions">
            <button type="button" className="profile-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="profile-btn-primary" disabled={saving}>
              {saving ? 'Updating...' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;
