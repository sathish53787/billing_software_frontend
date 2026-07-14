import React, { useMemo } from 'react';
import {
  buildUpiPayUrl,
  getUpiPayeeName,
} from './upiHelpers';
import './BillInvoice.css';

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const formatMoney = (value) => Number(value || 0).toFixed(2);

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(date);

  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  const hour = String(get('hour')).padStart(2, '0');
  const minute = String(get('minute')).padStart(2, '0');
  const dayPeriod = String(get('dayPeriod') || '').toUpperCase();
  return `${get('day')}-${get('month')}-${get('year')} ${hour}:${minute} ${dayPeriod}`;
};

const BillInvoice = ({ bill, company, cashierName }) => {
  const totals = useMemo(() => {
    const subtotal = round2(bill?.subtotal || 0);
    const totalGst = round2(bill?.totalGst || 0);
    const packingCharge = round2(bill?.packingCharge || 0);
    const deliveryCharge = round2(bill?.deliveryCharge || 0);
    const extraCharges = round2(packingCharge + deliveryCharge);
    const cgst = round2(totalGst / 2);
    const sgst = round2(totalGst - cgst);
    const grandTotal = round2(
      bill?.grandTotal || subtotal + totalGst + extraCharges
    );
    const gstRate = subtotal > 0 ? round2((totalGst / subtotal) * 100) : 0;
    const halfRate = round2(gstRate / 2);

    return {
      subtotal,
      cgst,
      sgst,
      halfRate,
      packingCharge,
      deliveryCharge,
      grandTotal,
    };
  }, [bill]);

  const upiId = company?.upiId?.trim() || '';
  const upiPayeeName = getUpiPayeeName(company);

  const upiPayUrl = useMemo(() => {
    if (!upiId) return '';
    return buildUpiPayUrl({
      upiId,
      payeeName: upiPayeeName,
      amount: totals.grandTotal,
      note: bill?.billNo || 'Bill Payment',
    });
  }, [upiId, upiPayeeName, totals.grandTotal, bill?.billNo]);

  const qrSrc = upiPayUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=8&data=${encodeURIComponent(upiPayUrl)}`
    : '';

  if (!bill) return null;

  return (
    <article className="bill-invoice" id="bill-invoice-print">
      <header className="bill-invoice-header">
        {company?.companyLogo ? (
          <img
            className="bill-invoice-logo"
            src={company.companyLogo}
            alt=""
          />
        ) : null}
        <h1 className="bill-invoice-brand">
          {company?.companyName || 'STV Billing Software'}
        </h1>
        {company?.address ? <p>{company.address}</p> : null}
        {company?.gstNo ? <p>GSTIN: {company.gstNo}</p> : null}
        {company?.companyPhone ? <p>Phone: {company.companyPhone}</p> : null}
      </header>

      <div className="bill-invoice-rule" aria-hidden />

      <section className="bill-invoice-meta">
        <div>
          <span>Bill No</span>
          <strong>{bill.billNo}</strong>
        </div>
        <div>
          <span>Date</span>
          <strong>{formatDateTime(bill.createdAt || bill.billDate)}</strong>
        </div>
        {bill.orderType ? (
          <div>
            <span>Order Type</span>
            <strong>{bill.orderType}</strong>
          </div>
        ) : null}
        {bill.customerName ? (
          <div>
            <span>Customer / Table</span>
            <strong>{bill.customerName}</strong>
          </div>
        ) : null}
        {bill.mobileNumber ? (
          <div>
            <span>Mobile</span>
            <strong>{bill.mobileNumber}</strong>
          </div>
        ) : null}
        {bill.deliveryAddress ? (
          <div>
            <span>Address</span>
            <strong>{bill.deliveryAddress}</strong>
          </div>
        ) : null}
        {cashierName ? (
          <div>
            <span>Cashier</span>
            <strong>{cashierName}</strong>
          </div>
        ) : null}
      </section>

      <div className="bill-invoice-rule" aria-hidden />

      <table className="bill-invoice-table">
        <thead>
          <tr>
            <th className="is-left">Item</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>Amt</th>
          </tr>
        </thead>
        <tbody>
          {(bill.items || []).map((item) => (
            <tr key={`${item.foodItemId}-${item.itemName}`}>
              <td className="is-left">{item.itemName}</td>
              <td>{item.quantity}</td>
              <td>{formatMoney(item.price)}</td>
              <td>{formatMoney(item.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="bill-invoice-rule" aria-hidden />

      <section className="bill-invoice-totals">
        <div>
          <span>Subtotal</span>
          <strong>{formatMoney(totals.subtotal)}</strong>
        </div>
        <div>
          <span>CGST ({totals.halfRate}%)</span>
          <strong>{formatMoney(totals.cgst)}</strong>
        </div>
        <div>
          <span>SGST ({totals.halfRate}%)</span>
          <strong>{formatMoney(totals.sgst)}</strong>
        </div>
        {totals.packingCharge > 0 ? (
          <div>
            <span>Packing Charge</span>
            <strong>{formatMoney(totals.packingCharge)}</strong>
          </div>
        ) : null}
        {totals.deliveryCharge > 0 ? (
          <div>
            <span>Delivery Charge</span>
            <strong>{formatMoney(totals.deliveryCharge)}</strong>
          </div>
        ) : null}
        <div className="is-grand">
          <span>Grand Total</span>
          <strong>{formatMoney(totals.grandTotal)}</strong>
        </div>
      </section>

      <div className="bill-invoice-rule" aria-hidden />

      {upiId ? (
        <>
          <section className="bill-invoice-qr">
            <p className="bill-invoice-qr-title">Scan &amp; Pay</p>
            {qrSrc ? (
              <img className="bill-invoice-qr-img" src={qrSrc} alt="UPI QR code" />
            ) : null}
            <p>UPI ID: {upiId}</p>
            {upiPayeeName ? <p>Name: {upiPayeeName}</p> : null}
          </section>
          <div className="bill-invoice-rule" aria-hidden />
        </>
      ) : null}

      <footer className="bill-invoice-footer">
        <p className="bill-invoice-thanks">Thank you! Visit again.</p>
      </footer>
    </article>
  );
};

export default BillInvoice;
