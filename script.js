import { db, ref, push, set } from './firebase-config.js';

// ---------- TELEGRAM WEBAPP ----------
let tg = null;
if (window.Telegram && window.Telegram.WebApp) {
  tg = window.Telegram.WebApp;
  tg.expand();
  console.log('✅ Telegram WebApp initialized');
}

// ---------- MAHSULOTLAR ----------
const menu = [
  { id: 1, name: 'Klyukva-Burger kombo', price: 64000, img: 'https://i.ibb.co/sJtWCn5M/images-1.jpg' },
  { id: 2, name: 'Klyukva-Lavash kombo', price: 59000, img: 'https://i.ibb.co/sJtWCn5M/images-1.jpg' },
  { id: 3, name: 'Klyukva-Trindwich kombo', price: 62000, img: 'https://i.ibb.co/sJtWCn5M/images-1.jpg' },
  { id: 4, name: 'Klyukva-Burger', price: 44000, img: 'https://i.ibb.co/sJtWCn5M/images-1.jpg' },
  { id: 5, name: 'Klyukva-Duble Burger', price: 74000, img: 'https://i.ibb.co/sJtWCn5M/images-1.jpg' },
];

// ---------- INDEXEDDB ----------
const DB_NAME = 'bodrumDB';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('profile')) {
        db.createObjectStore('profile', { keyPath: 'id' });
      }
    };
  });
}

async function saveProfileDB({ name, phone }) {
  const db = await openDB();
  const tx = db.transaction('profile', 'readwrite');
  tx.objectStore('profile').put({ id: 1, name, phone });
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = reject;
  });
}

async function getProfileDB() {
  try {
    const db = await openDB();
    const tx = db.transaction('profile', 'readonly');
    const result = await new Promise((resolve, reject) => {
      const req = tx.objectStore('profile').get(1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return result;
  } catch (error) {
    return null;
  }
}

// ---------- SAVAT ----------
const CART_KEY = 'bodrum_cart';
let cart = [];
let currentLocation = null;
let selectedPaymentMethod = 'payme';

function saveCartLS() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function loadCartLS() {
  const raw = localStorage.getItem(CART_KEY);
  cart = raw ? JSON.parse(raw) : [];
}

// ---------- UI ELEMENTLAR ----------
const menuGrid = document.getElementById('menuGrid');
const cartList = document.getElementById('cartList');
const cartBadge = document.getElementById('cartBadge');
const cartTotal = document.getElementById('cartTotal');
const orderBtn = document.getElementById('orderBtn');
const paymentModal = document.getElementById('paymentModal');
const paymentTotal = document.getElementById('paymentTotal');
const confirmPaymentBtn = document.getElementById('confirmPaymentBtn');
const confirmCodeBtn = document.getElementById('confirmCodeBtn');
const smsCodeGroup = document.getElementById('smsCodeGroup');
const btnText = document.getElementById('btnText');
const btnLoader = document.getElementById('btnLoader');

// ---------- BOSHLANG'ICH SOZLASH ----------
loadCartLS();
renderMenu();
renderCart();

// ---------- MENYU ----------
function renderMenu() {
  menuGrid.innerHTML = '';
  menu.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.animationDelay = `${index * 0.1}s`;
    card.innerHTML = `
      <img src="${item.img}" alt="${item.name}" loading="lazy">
      <h3>${item.name}</h3>
      <div class="price">${item.price.toLocaleString()} so'm</div>
      <button class="add-btn-only" data-id="${item.id}">Savatchaga</button>
    `;
    menuGrid.appendChild(card);
  });
}

menuGrid.addEventListener('click', e => {
  if (e.target.classList.contains('add-btn-only')) {
    const id = +e.target.dataset.id;
    const product = menu.find(p => p.id === id);
    const exist = cart.find(c => c.id === id);
    
    if (exist) exist.qty++;
    else cart.push({ ...product, qty: 1 });
    
    saveCartLS();
    renderCart();
    
    // Badge animatsiya
    cartBadge.style.transform = 'scale(1.3)';
    setTimeout(() => cartBadge.style.transform = 'scale(1)', 200);
  }
});

// ---------- SAVAT RENDER ----------
function renderCart() {
  cartList.innerHTML = '';
  let total = 0;
  
  if (cart.length === 0) {
    cartList.innerHTML = '<div class="empty-cart">Savat bo\'sh</div>';
    cartBadge.textContent = '0';
    cartTotal.textContent = 'Umumiy: 0 so\'m';
    return;
  }
  
  cart.forEach((item, idx) => {
    total += item.price * item.qty;
    cartList.insertAdjacentHTML('beforeend', `
      <div class="cart-item">
        <img src="${item.img}" alt="${item.name}">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">${(item.price * item.qty).toLocaleString()} so'm</div>
        </div>
        <div class="cart-item-controls">
          <div class="cart-item-qty">
            <button data-idx="${idx}" data-act="-">−</button>
            <span>${item.qty}</span>
            <button data-idx="${idx}" data-act="+">+</button>
          </div>
          <button class="cart-item-delete" data-idx="${idx}">🗑</button>
        </div>
      </div>
    `);
  });
  
  cartBadge.textContent = cart.reduce((s, i) => s + i.qty, 0);
  cartTotal.textContent = `Umumiy: ${total.toLocaleString()} so'm`;
}

// Savat boshqaruvi
cartList.addEventListener('click', e => {
  const idx = +e.target.dataset.idx;
  if (isNaN(idx)) return;
  
  const act = e.target.dataset.act;
  if (act === '+') cart[idx].qty++;
  else if (act === '-') {
    if (cart[idx].qty > 1) cart[idx].qty--;
    else cart.splice(idx, 1);
  }
  
  if (e.target.classList.contains('cart-item-delete')) {
    cart.splice(idx, 1);
  }
  
  saveCartLS();
  renderCart();
});

// ---------- TAB SWITCH ----------
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab, .tab-content').forEach(el => el.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// ---------- JOYLASHUV ----------
function requestLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(`${position.coords.latitude},${position.coords.longitude}`),
      (error) => reject(error),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });
}

// ---------- TO'LOV MODAL ----------
document.querySelectorAll('.payment-method').forEach(method => {
  method.addEventListener('click', () => {
    document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('active'));
    method.classList.add('active');
    selectedPaymentMethod = method.dataset.method;
    
    if (selectedPaymentMethod === 'cash') {
      document.querySelector('.payment-info').textContent = '💵 Yetkazib berilganda naqd pul to\'laysiz';
      smsCodeGroup.style.display = 'none';
      confirmPaymentBtn.style.display = 'block';
      confirmCodeBtn.style.display = 'none';
      btnText.textContent = 'Buyurtma berish';
    } else {
      document.querySelector('.payment-info').textContent = '📱 Telefon raqamingizga SMS kod yuboriladi';
      btnText.textContent = 'To\'lovni davom ettirish';
    }
  });
});

// Telefon formati
document.getElementById('paymentPhone').addEventListener('input', (e) => {
  e.target.value = e.target.value.replace(/\D/g, '').slice(0, 9);
});

// Buyurtma bosilganda
orderBtn.addEventListener('click', async () => {
  if (!cart.length) {
    alert('Savat bo\'sh!');
    return;
  }
  
  const profile = await getProfileDB();
  if (!profile || !profile.name || !profile.phone) {
    alert('Iltimos avval profilni to\'ldiring!');
    document.querySelector('[data-tab="profile"]').click();
    return;
  }
  
  orderBtn.disabled = true;
  orderBtn.textContent = 'Joylashuv aniqlanmoqda...';
  
  try {
    currentLocation = await requestLocation();
    console.log('📍 Location:', currentLocation);
  } catch (error) {
    console.warn('Location error:', error);
  }
  
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  paymentTotal.textContent = total.toLocaleString() + ' so\'m';
  document.getElementById('paymentPhone').value = profile.phone || '';
  
  paymentModal.classList.add('show');
  orderBtn.disabled = false;
  orderBtn.textContent = 'Buyurtma berish';
});

// To'lov tugmasi
confirmPaymentBtn.addEventListener('click', async () => {
  const phone = document.getElementById('paymentPhone').value.trim();
  
  if (!phone || phone.length !== 9) {
    alert('Telefon raqamni to\'g\'ri kiriting!');
    return;
  }
  
  if (selectedPaymentMethod === 'cash') {
    await completeOrder('cash', 'pending');
    return;
  }
  
  // Payme/Click uchun SMS
  btnText.textContent = 'Kod yuborilmoqda...';
  btnLoader.style.display = 'inline-block';
  confirmPaymentBtn.disabled = true;
  
  setTimeout(() => {
    btnLoader.style.display = 'none';
    smsCodeGroup.style.display = 'block';
    confirmPaymentBtn.style.display = 'none';
    confirmCodeBtn.style.display = 'block';
    document.getElementById('smsCode').focus();
    alert('📱 Test rejimi: SMS kod - 12345');
  }, 1500);
});

confirmCodeBtn.addEventListener('click', async () => {
  const code = document.getElementById('smsCode').value.trim();
  if (code !== '12345') {
    alert('Noto\'g\'ri kod! Test rejimi uchun: 12345');
    return;
  }
  await completeOrder(selectedPaymentMethod, 'paid');
});

// ========== ASOSIY BUYURTMA FUNKSiyasi ==========
async function completeOrder(paymentMethod, paymentStatus) {
  const profile = await getProfileDB();
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  
  const orderData = {
    name: profile.name,
    phone: profile.phone,
    items: cart.map(item => ({
      name: item.name,
      price: item.price,
      qty: item.qty
    })),
    total: total,
    status: 'pending',
    createdAt: new Date().toISOString(),
    location: currentLocation || null,
    paymentMethod: paymentMethod,
    paymentStatus: paymentStatus,
    tg_id: tg?.initDataUnsafe?.user?.id || null,
    userAgent: navigator.userAgent
  };
  
  console.log('📤 Firebase ga yuborilmoqda:', orderData);
  
  try {
    // ASOSIY: Firebase ga yozish
    const ordersRef = ref(db, 'orders');
    const newOrderRef = push(ordersRef);
    await set(newOrderRef, orderData);
    
    console.log('✅ Buyurtma muvaffaqiyatli yuborildi:', newOrderRef.key);
    
    // Muvaffaqiyatli ko'rsatish
    document.getElementById('paymentForm').style.display = 'none';
    document.getElementById('paymentSuccess').style.display = 'block';
    
    setTimeout(() => {
      closePaymentModal();
      cart = [];
      saveCartLS();
      renderCart();
      document.querySelector('[data-tab="profile"]').click();
    }, 2000);
    
  } catch (error) {
    console.error('❌ Firebase xato:', error);
    alert('Xatolik yuz berdi: ' + error.message);
  }
}

function closePaymentModal() {
  paymentModal.classList.remove('show');
  setTimeout(() => {
    document.getElementById('paymentForm').style.display = 'block';
    document.getElementById('paymentSuccess').style.display = 'none';
    smsCodeGroup.style.display = 'none';
    confirmPaymentBtn.style.display = 'block';
    confirmCodeBtn.style.display = 'none';
    confirmPaymentBtn.disabled = false;
    document.getElementById('smsCode').value = '';
    selectedPaymentMethod = 'payme';
    document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('active'));
    document.querySelector('[data-method="payme"]').classList.add('active');
  }, 300);
}

// ---------- PROFIL ----------
const modalName = document.getElementById('modalName');
const modalPhone = document.getElementById('modalPhone');

document.getElementById('modalSave').addEventListener('click', async () => {
  const name = modalName.value.trim();
  const phone = modalPhone.value.trim();
  
  if (!name || !phone || phone.length !== 9) {
    alert('Iltimos, ma\'lumotlarni to\'g\'ri kiriting!');
    return;
  }
  
  await saveProfileDB({ name, phone });
  document.getElementById('profModal').classList.remove('show');
  alert('✅ Profil saqlandi!');
});

const inpName = document.getElementById('inpName');
const inpPhone = document.getElementById('inpPhone');

document.querySelector('[data-tab="profile"]').addEventListener('click', async () => {
  const profile = await getProfileDB();
  if (profile) {
    inpName.value = profile.name || '';
    inpPhone.value = profile.phone || '';
  }
});

document.getElementById('saveProf').addEventListener('click', async () => {
  const name = inpName.value.trim();
  const phone = inpPhone.value.trim();
  
  if (!name || !phone || phone.length !== 9) {
    alert('Iltimos, hammasini to\'ldiring!');
    return;
  }
  
  await saveProfileDB({ name, phone });
  alert('✅ Saqlandi!');
});

// Telefon formati
[inpPhone, modalPhone].forEach(input => {
  if (input) {
    input.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 9);
    });
  }
});

console.log('🎉 App initialized');
