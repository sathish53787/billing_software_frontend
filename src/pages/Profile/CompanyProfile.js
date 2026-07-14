import React, { useEffect, useRef, useState } from 'react';
import { FiCamera } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { getCompany, saveCompany } from '../../Services/apiService';
import { resolveBankFromUpiId } from '../Billing/upiHelpers';
import AppShell from '../Layout/AppShell';
import '../Dashboard/Dashboard.css';
import './CompanyProfile.css';

const emptyForm = {
  companyName: '',
  companyPhone: '',
  address: '',
  gstNo: '',
  bankName: '',
  accountHolderName: '',
  accountNo: '',
  ifscCode: '',
  upiId: '',
  upiName: '',
};

const CompanyProfile = () => {
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [hasCompany, setHasCompany] = useState(false);

  useEffect(() => {
    let active = true;

    const loadCompany = async () => {
      setLoading(true);
      try {
        const data = await getCompany();
        if (!active) return;

        if (data?.company) {
          setHasCompany(true);
          setForm({
            companyName: data.company.companyName || '',
            companyPhone: data.company.companyPhone || '',
            address: data.company.address || '',
            gstNo: data.company.gstNo || '',
            bankName: data.company.bankName || '',
            accountHolderName: data.company.accountHolderName || '',
            accountNo: data.company.accountNo || '',
            ifscCode: data.company.ifscCode || '',
            upiId: data.company.upiId || '',
            upiName: data.company.upiName || '',
          });
          setLogoPreview(data.company.companyLogo || '');
        } else {
          setHasCompany(false);
          setForm(emptyForm);
          setLogoPreview('');
        }
      } catch (error) {
        if (!active) return;
        toast.error(
          error?.response?.data?.message || error.message || 'Failed to load company details'
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    loadCompany();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (logoPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };

      if (name === 'upiId') {
        const detectedBank = resolveBankFromUpiId(value);
        if (detectedBank && !String(prev.bankName || '').trim()) {
          next.bankName = detectedBank;
        }
        if (!String(prev.upiName || '').trim() && String(prev.accountHolderName || '').trim()) {
          next.upiName = prev.accountHolderName.trim();
        }
      }

      if (name === 'accountHolderName' && !String(prev.upiName || '').trim()) {
        next.upiName = value;
      }

      return next;
    });
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const onPickLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo must be under 5MB');
      return;
    }

    if (logoPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreview);
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setErrors((prev) => ({ ...prev, companyLogo: '' }));
  };

  const validate = () => {
    const next = {};
    if (!form.companyName.trim()) next.companyName = 'Company name is required';
    if (!form.companyPhone.trim()) next.companyPhone = 'Company phone is required';
    else if (!/^(\+\d{1,3}[- ]?)?\d{10}$/.test(String(form.companyPhone).replace(/\s/g, ''))) {
      next.companyPhone = 'Enter a valid phone number';
    }
    if (!form.address.trim()) next.address = 'Address is required';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const data = await saveCompany(
        {
          companyName: form.companyName.trim(),
          companyPhone: String(form.companyPhone).replace(/\s/g, '').trim(),
          address: form.address.trim(),
          gstNo: form.gstNo.trim().toUpperCase(),
          bankName: form.bankName.trim(),
          accountHolderName: form.accountHolderName.trim(),
          accountNo: form.accountNo.trim(),
          ifscCode: form.ifscCode.trim().toUpperCase(),
          upiId: form.upiId.trim(),
          upiName: form.upiName.trim(),
        },
        logoFile
      );

      if (!data?.success) {
        toast.error(data?.message || 'Failed to save company details');
        return;
      }

      setHasCompany(true);
      setLogoFile(null);
      if (data.company?.companyLogo) {
        setLogoPreview(data.company.companyLogo);
      }
      toast.success(data.message || 'Company details saved successfully');
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error.message || 'Failed to save company details'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Company Profile" subtitle="Business account details">
      {loading ? (
        <div className="dash-panel company-panel">
          <p className="company-loading">Loading company details...</p>
        </div>
      ) : (
        <form className="company-form" onSubmit={onSubmit}>
          <div className="dash-panel company-panel">
            <h2>Company Information</h2>

            <div className="company-logo-row">
              <div className="company-logo-preview">
                {logoPreview ? (
                  <img src={logoPreview} alt="Company logo" />
                ) : (
                  <span>Logo</span>
                )}
              </div>
              <div>
                <p className="company-logo-title">Company Logo</p>
                <p className="company-logo-hint">JPG, PNG or WEBP up to 5MB</p>
                <button
                  type="button"
                  className="company-upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FiCamera />
                  Upload Logo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  hidden
                  onChange={onPickLogo}
                />
                {errors.companyLogo ? (
                  <span className="company-error">{errors.companyLogo}</span>
                ) : null}
              </div>
            </div>

            <div className="company-grid">
              <div className="company-field">
                <label htmlFor="companyName">Company Name</label>
                <input
                  id="companyName"
                  name="companyName"
                  value={form.companyName}
                  onChange={onChange}
                  placeholder="Enter company name"
                />
                {errors.companyName ? (
                  <span className="company-error">{errors.companyName}</span>
                ) : null}
              </div>

              <div className="company-field">
                <label htmlFor="companyPhone">Company Phone</label>
                <input
                  id="companyPhone"
                  name="companyPhone"
                  value={form.companyPhone}
                  onChange={onChange}
                  placeholder="Enter company phone"
                />
                {errors.companyPhone ? (
                  <span className="company-error">{errors.companyPhone}</span>
                ) : null}
              </div>

              <div className="company-field company-field-full">
                <label htmlFor="address">Address</label>
                <textarea
                  id="address"
                  name="address"
                  rows={3}
                  value={form.address}
                  onChange={onChange}
                  placeholder="Enter company address"
                />
                {errors.address ? (
                  <span className="company-error">{errors.address}</span>
                ) : null}
              </div>

              <div className="company-field">
                <label htmlFor="gstNo">GST No</label>
                <input
                  id="gstNo"
                  name="gstNo"
                  value={form.gstNo}
                  onChange={onChange}
                  placeholder="Enter GST number"
                />
                {errors.gstNo ? <span className="company-error">{errors.gstNo}</span> : null}
              </div>
            </div>
          </div>

          <div className="dash-panel company-panel">
            <h2>Bank Information</h2>
            <div className="company-grid">
              <div className="company-field">
                <label htmlFor="bankName">Bank Name</label>
                <input
                  id="bankName"
                  name="bankName"
                  value={form.bankName}
                  onChange={onChange}
                  placeholder="Enter bank name"
                />
                {errors.bankName ? (
                  <span className="company-error">{errors.bankName}</span>
                ) : null}
              </div>

              <div className="company-field">
                <label htmlFor="accountHolderName">Account Holder Name</label>
                <input
                  id="accountHolderName"
                  name="accountHolderName"
                  value={form.accountHolderName}
                  onChange={onChange}
                  placeholder="Enter account holder name"
                />
                {errors.accountHolderName ? (
                  <span className="company-error">{errors.accountHolderName}</span>
                ) : null}
              </div>

              <div className="company-field">
                <label htmlFor="accountNo">Account No</label>
                <input
                  id="accountNo"
                  name="accountNo"
                  value={form.accountNo}
                  onChange={onChange}
                  placeholder="Enter account number"
                />
                {errors.accountNo ? (
                  <span className="company-error">{errors.accountNo}</span>
                ) : null}
              </div>

              <div className="company-field">
                <label htmlFor="ifscCode">IFSC Code</label>
                <input
                  id="ifscCode"
                  name="ifscCode"
                  value={form.ifscCode}
                  onChange={onChange}
                  placeholder="Enter IFSC code"
                />
                {errors.ifscCode ? (
                  <span className="company-error">{errors.ifscCode}</span>
                ) : null}
              </div>

              <div className="company-field">
                <label htmlFor="upiId">UPI Id</label>
                <input
                  id="upiId"
                  name="upiId"
                  value={form.upiId}
                  onChange={onChange}
                  placeholder="example@oksbi"
                />
                {resolveBankFromUpiId(form.upiId) ? (
                  <span className="company-hint">
                    Detected bank: {resolveBankFromUpiId(form.upiId)}
                  </span>
                ) : null}
              </div>

              <div className="company-field">
                <label htmlFor="upiName">UPI Name</label>
                <input
                  id="upiName"
                  name="upiName"
                  value={form.upiName}
                  onChange={onChange}
                  placeholder="Name shown on UPI payment"
                />
              </div>
            </div>
          </div>

          <div className="company-actions">
            <button type="submit" className="company-save-btn" disabled={saving}>
              {saving ? 'Saving...' : hasCompany ? 'Update Company' : 'Save Company'}
            </button>
          </div>
        </form>
      )}
    </AppShell>
  );
};

export default CompanyProfile;
