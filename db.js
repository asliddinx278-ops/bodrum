// db.js
const DB_NAME = 'bodrumDB';
const STORE_PROFILE = 'profile';
const STORE_ORDERS = 'orders';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PROFILE)) {
        db.createObjectStore(STORE_PROFILE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_ORDERS)) {
        db.createObjectStore(STORE_ORDERS, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// ✅ Tuzatildi: Promise bilan to'g'ri ishlash
export async function saveProfileDB({ name, phone }) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROFILE, 'readwrite');
    const store = tx.objectStore(STORE_PROFILE);
    const request = store.put({ id: 1, name, phone });
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    tx.onerror = () => reject(tx.error);
  });
}

// ✅ Tuzatildi: Promise bilan to'g'ri ishlash
export async function getProfileDB() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROFILE, 'readonly');
    const store = tx.objectStore(STORE_PROFILE);
    const request = store.get(1);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function addOrderDB({ text, date }) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ORDERS, 'readwrite');
    const store = tx.objectStore(STORE_ORDERS);
    const request = store.add({ text, date });
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getOrdersDB() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ORDERS, 'readonly');
    const store = tx.objectStore(STORE_ORDERS);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result.reverse());
    request.onerror = () => reject(request.error);
  });
}