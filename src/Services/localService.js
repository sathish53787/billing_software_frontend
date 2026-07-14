export const setItem = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const getItem = (key) => {
  const item = localStorage.getItem(key);
  return item && item !== 'undefined' ? JSON.parse(item) : null;
};

export const removeItem = (key) => {
  localStorage.removeItem(key);
};
