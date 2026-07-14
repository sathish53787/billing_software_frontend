const UPI_HANDLE_BANKS = {
  ybl: 'Yes Bank',
  axl: 'Axis Bank',
  ibl: 'IDFC First Bank',
  paytm: 'Paytm Payments Bank',
  ptyes: 'Yes Bank',
  okaxis: 'Axis Bank',
  okicici: 'ICICI Bank',
  okhdfcbank: 'HDFC Bank',
  oksbi: 'State Bank of India',
  sbi: 'State Bank of India',
  hdfcbank: 'HDFC Bank',
  icici: 'ICICI Bank',
  axisbank: 'Axis Bank',
  kotak: 'Kotak Mahindra Bank',
  indus: 'IndusInd Bank',
  freecharge: 'Axis Bank',
  amazonpay: 'Yes Bank',
  apl: 'Axis Bank',
  waaxis: 'Axis Bank',
  wahdfcbank: 'HDFC Bank',
  wasbi: 'State Bank of India',
  waicici: 'ICICI Bank',
  Jupiteraxis: 'Axis Bank',
  naviaxis: 'Axis Bank',
  pingpay: 'Axis Bank',
  sliceaxis: 'Axis Bank',
  timecosmos: 'Bank of India',
  uboi: 'Union Bank of India',
  unionbank: 'Union Bank of India',
  cnb: 'Canara Bank',
  cnrb: 'Canara Bank',
  pnb: 'Punjab National Bank',
  barodampay: 'Bank of Baroda',
  bob: 'Bank of Baroda',
  dlwb: 'Dhanlaxmi Bank',
  federal: 'Federal Bank',
  kbl: 'Karnataka Bank',
  kvb: 'Karur Vysya Bank',
  yesbankltd: 'Yes Bank',
};

export const resolveBankFromUpiId = (upiId = '') => {
  const handle = String(upiId).trim().split('@')[1]?.toLowerCase() || '';
  if (!handle) return '';
  if (UPI_HANDLE_BANKS[handle]) return UPI_HANDLE_BANKS[handle];

  const matchedKey = Object.keys(UPI_HANDLE_BANKS).find(
    (key) => handle.includes(key) || key.includes(handle)
  );
  return matchedKey ? UPI_HANDLE_BANKS[matchedKey] : '';
};

export const getUpiPayeeName = (company) => {
  return (
    String(company?.upiName || '').trim() ||
    String(company?.accountHolderName || '').trim() ||
    String(company?.companyName || '').trim() ||
    'Merchant'
  );
};

export const getUpiBankName = (company) => {
  return (
    String(company?.bankName || '').trim() ||
    resolveBankFromUpiId(company?.upiId) ||
    ''
  );
};

export const buildUpiPayUrl = ({ upiId, payeeName, amount, note }) => {
  if (!upiId) return '';
  const query = [
    `pa=${encodeURIComponent(String(upiId).trim())}`,
    `pn=${encodeURIComponent(payeeName || 'Merchant')}`,
    `am=${encodeURIComponent(Number(amount || 0).toFixed(2))}`,
    'cu=INR',
    `tn=${encodeURIComponent(note || 'Bill Payment')}`,
  ].join('&');
  return `upi://pay?${query}`;
};
