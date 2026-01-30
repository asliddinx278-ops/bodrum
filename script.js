// ---------- TELEGRAM WEBAPP INITIALIZATION ----------
let tg = null;
let isTelegramWebApp = false;

function initTelegram() {
  if (window.Telegram && window.Telegram.WebApp) {
    tg = window.Telegram.WebApp;
    isTelegramWebApp = true;
    
    tg.expand();
    
    console.log('✅ Telegram WebApp initialized');
    console.log('User:', tg.initDataUnsafe.user);
  } else {
    console.warn('⚠️ Not running in Telegram WebApp');
    showWarning();
  }
}

function showWarning() {
  const warning = document.createElement('div');
  warning.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #ff6600;
    color: white;
    padding: 12px;
    text-align: center;
    font-size: 14px;
    z-index: 9999;
  `;
  warning.innerHTML = '⚠️ Bu ilova faqat Telegram bot orqali ishlaydi!';
  document.body.prepend(warning);
}

// Initialize on load
initTelegram();

// ---------- 1. MAHSULOTLAR ----------
const menu = [
  { id: 1, name: 'Klyukva-Burger kombo', price: 64000, img: 'https://i.ibb.co/sJtWCn5M/images-1.jpg' },
  { id: 2, name: 'Klyukva-Lavash kombo', price: 59000, img: 'https://i.ibb.co/sJtWCn5M/images-1.jpg' },
  { id: 3, name: 'Klyukva-Trindwich kombo', price: 62000, img: 'https://i.ibb.co/sJtWCn5M/images-1.jpg' },
  { id: 4, name: 'Klyukva-Burger', price: 44000, img: 'https://i.ibb.co/sJtWCn5M/images-1.jpg' },
];

// ---------- 2. INDEXEDDB ----------
const DB_NAME = 'bodrumDB';
const STORE_PROFILE = 'profile';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PROFILE))
        db.createObjectStore(STORE_PROFILE, { keyPath: 'id' });
    };
  });
}

async function saveProfileDB({ name, phone }) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_PROFILE, 'readwrite');
    tx.objectStore(STORE_PROFILE).put({ id: 1, name, phone });
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch (error) {
    console.error('❌ Error saving profile:', error);
    throw error;
  }
}

async function getProfileDB() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_PROFILE, 'readonly');
    const result = await new Promise((resolve, reject) => {
      const req = tx.objectStore(STORE_PROFILE).get(1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return result;
  } catch (error) {
    console.error('❌ Error:', error);
    return null;
  }
}

// ---------- 3. LOCALSTORAGE ----------
const CART_KEY = 'bodrum_cart';

function saveCartLS() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function loadCartLS() {
  const raw = localStorage.getItem(CART_KEY);
  cart = raw ? JSON.parse(raw) : [];
}

// ---------- 4. TAB SWITCH ----------
document.querySelectorAll('.tab').forEach(btn =>
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab, .tab-content').forEach(el => el.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  })
);

// ---------- 5. CART ----------
const menuGrid = document.getElementById('menuGrid');
const cartList = document.getElementById('cartList');
const cartBadge = document.getElementById('cartBadge');
const cartTotal = document.getElementById('cartTotal');
const orderBtn = document.getElementById('orderBtn');

let cart = [];
let currentLocation = null;
let selectedPaymentMethod = 'payme';

loadCartLS();
renderCart();

// Menu render
menu.forEach(item => {
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <img src="${item.img}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/120?text=No+Image'">
    <h3>${item.name}</h3>
    <div class="price">${item.price.toLocaleString()} so'm</div>
    <button class="add-btn-only" data-id="${item.id}">Savatchaga</button>
  `;
  menuGrid.appendChild(card);
});

// Add to cart
menuGrid.addEventListener('click', e => {
  if (e.target.classList.contains('add-btn-only')) {
    const id = +e.target.dataset.id;
    const product = menu.find(p => p.id === id);
    const exist = cart.find(c => c.id === id);
    
    if (exist) {
      exist.qty++;
    } else {
      cart.push({ ...product, qty: 1 });
    }
    
    saveCartLS();
    renderCart();
    
    // Animatsiya
    const badge = document.getElementById('cartBadge');
    badge.style.transform = 'scale(1.3)';
    setTimeout(() => badge.style.transform = 'scale(1)', 200);
  }
});

function renderCart() {
  cartList.innerHTML = '';
  let total = 0;
  
  if (cart.length === 0) {
    cartList.innerHTML = '<div style="padding: 20px; text-align: center; color: #888;">Savat bo\'sh</div>';
    cartBadge.textContent = '0';
    cartTotal.textContent = 'Umumiy: 0 so\'m';
    return;
  }
  
  cart.forEach((item, idx) => {
    total += item.price * item.qty;
    cartList.insertAdjacentHTML('beforeend', `
      <div class="cart-item">
        <img src="${item.img}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/80?text=No+Image'">
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
          <button class="cart-item-delete" data-idx="${idx}">
            <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>
      </div>
    `);
  });
  
  const totalQty = cart.reduce((s, i) => s + i.qty, 0);
  cartBadge.textContent = totalQty;
  cartTotal.textContent = `Umumiy: ${total.toLocaleString()} so'm`;
}

// Cart controls
cartList.addEventListener('click', e => {
  const idx = +e.target.dataset.idx;
  if (isNaN(idx)) return;
  
  const act = e.target.dataset.act;
  if (act === '+') {
    cart[idx].qty++;
  } else if (act === '-') {
    if (cart[idx].qty > 1) cart[idx].qty--;
    else cart.splice(idx, 1);
  }
  
  if (e.target.closest('.cart-item-delete')) {
    cart.splice(idx, 1);
  }
  
  saveCartLS();
  renderCart();
});

// Joylashuvni olish
function requestLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        resolve(`${lat},${lon}`);
      },
      (error) => {
        reject(error);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

// ---------- PAYMENT MODAL LOGIC ----------
const paymentModal = document.getElementById('paymentModal');
const paymentTotal = document.getElementById('paymentTotal');
const paymentPhone = document.getElementById('paymentPhone');
const paymentForm = document.getElementById('paymentForm');
const paymentSuccess = document.getElementById('paymentSuccess');
const confirmPaymentBtn = document.getElementById('confirmPaymentBtn');
const confirmCodeBtn = document.getElementById('confirmCodeBtn');
const smsCodeGroup = document.getElementById('smsCodeGroup');
const btnText = document.getElementById('btnText');
const btnLoader = document.getElementById('btnLoader');

// To'lov usullarini tanlash
document.querySelectorAll('.payment-method').forEach(method => {
  method.addEventListener('click', () => {
    document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('active'));
    method.classList.add('active');
    selectedPaymentMethod = method.dataset.method;
    
    // Naqd to'lov uchun maxsus ko'rinish
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
paymentPhone.addEventListener('input', (e) => {
  e.target.value = e.target.value.replace(/\D/g, '').slice(0, 9);
});

// To'lovni boshlash
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
  
  // Joylashuvni olish
  orderBtn.disabled = true;
  orderBtn.textContent = 'Joylashuv aniqlanmoqda...';
  
  try {
    currentLocation = await requestLocation();
    console.log('📍 Location:', currentLocation);
  } catch (error) {
    console.warn('Location error:', error);
    // Joylashuv olmasa ham davom etish (ixtiyoriy)
    if (!confirm('Joylashuvni aniqlashda xatolik. Davom etishni xohlaysizmi?')) {
      orderBtn.disabled = false;
      orderBtn.textContent = 'Buyurtma berish';
      return;
    }
  }
  
  // To'lov modalini ochish
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  paymentTotal.textContent = total.toLocaleString() + ' so\'m';
  
  // Profil telefonini avto to'ldirish
  paymentPhone.value = profile.phone || '';
  
  // Modalni ko'rsatish
  paymentModal.classList.add('show');
  
  orderBtn.disabled = false;
  orderBtn.textContent = 'Buyurtma berish';
});

// To'lov tugmasi bosilganda
confirmPaymentBtn.addEventListener('click', async () => {
  const phone = paymentPhone.value.trim();
  
  if (!phone || phone.length !== 9) {
    alert('Telefon raqamni to\'g\'ri kiriting!');
    paymentPhone.focus();
    return;
  }
  
  if (selectedPaymentMethod === 'cash') {
    // Naqd to'lov - to'g'ridan-to'g'ri buyurtma
    await completeOrder('cash', 'pending');
    return;
  }
  
  // Payme/Click uchun SMS kod imitatsiyasi
  btnText.textContent = 'Kod yuborilmoqda...';
  btnLoader.style.display = 'inline-block';
  confirmPaymentBtn.disabled = true;
  
  // Simulyatsiya - 2 soniya kutish
  setTimeout(() => {
    btnLoader.style.display = 'none';
    smsCodeGroup.style.display = 'block';
    confirmPaymentBtn.style.display = 'none';
    confirmCodeBtn.style.display = 'block';
    
    // Kod kiritish maydoniga fokus
    document.getElementById('smsCode').focus();
    
    alert('📱 Test rejimi: SMS kod - 12345');
  }, 1500);
});

// SMS kodni tasdiqlash
confirmCodeBtn.addEventListener('click', async () => {
  const code = document.getElementById('smsCode').value.trim();
  
  if (code !== '12345') {
    alert('Noto\'g\'ri kod! Test rejimi uchun: 12345');
    return;
  }
  
  await completeOrder(selectedPaymentMethod, 'paid');
});

// Buyurtmani yakunlash funksiyasi
async function completeOrder(paymentMethod, paymentStatus) {
  const profile = await getProfileDB();
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  
  const order = {
    id: Date.now(),
    name: profile.name,
    phone: profile.phone,
    items: [...cart],
    total: total,
    status: 'pending',
    createdAt: new Date().toISOString(),
    location: currentLocation,
    paymentMethod: paymentMethod, // payme, click, cash
    paymentStatus: paymentStatus, // paid, pending
    tg_id: tg?.initDataUnsafe?.user?.id || null
  };
  
  // LocalStorage ga saqlash
  const existingOrders = JSON.parse(localStorage.getItem('bodrum_admin_orders') || '[]');
  existingOrders.unshift(order);
  localStorage.setItem('bodrum_admin_orders', JSON.stringify(existingOrders));
  
  // Muvaffaqiyatli ko'rsatish
  paymentForm.style.display = 'none';
  paymentSuccess.style.display = 'block';
  
  // 2 soniyadan keyin yopish
  setTimeout(() => {
    // Modalni yopish
    closePaymentModal();
    
    // Savatni tozalash
    cart = [];
    saveCartLS();
    renderCart();
    
    // Profilga o'tish
    document.querySelector('[data-tab="profile"]').click();
  }, 2000);
}

function closePaymentModal() {
  paymentModal.classList.remove('show');
  
  // Reset form
  setTimeout(() => {
    paymentForm.style.display = 'block';
    paymentSuccess.style.display = 'none';
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

// ---------- PROFILE ----------
const profModal = document.getElementById('profModal');
const modalName = document.getElementById('modalName');
const modalPhone = document.getElementById('modalPhone');
const modalSave = document.getElementById('modalSave');

function openProfModal() {
  profModal.classList.add('show');
  modalName.focus();
}

function closeProfModal() {
  profModal.classList.remove('show');
}

modalSave.addEventListener('click', async () => {
  const name = modalName.value.trim();
  const phone = modalPhone.value.trim();
  
  if (!name) {
    alert('Ismingizni kiriting!');
    modalName.focus();
    return;
  }
  
  if (!phone || phone.length !== 9) {
    alert('Telefon 9 ta raqam bo\'lishi kerak!');
    modalPhone.focus();
    return;
  }
  
  try {
    await saveProfileDB({ name, phone });
    closeProfModal();
    alert('✅ Profil saqlandi!');
  } catch (error) {
    alert('Xatolik yuz berdi.');
  }
});

const inpName = document.getElementById('inpName');
const inpPhone = document.getElementById('inpPhone');
const saveProf = document.getElementById('saveProf');

document.querySelector('[data-tab="profile"]').addEventListener('click', async () => {
  const profile = await getProfileDB();
  if (profile) {
    inpName.value = profile.name || '';
    inpPhone.value = profile.phone || '';
  }
  renderUserOrders();
});

function renderUserOrders() {
  const ordersList = document.getElementById('ordersList');
  const allOrders = JSON.parse(localStorage.getItem('bodrum_admin_orders') || '[]');
  
  if (allOrders.length === 0) {
    ordersList.innerHTML = 'Hali buyurtma yo\'q';
    return;
  }
  
  const recentOrders = allOrders.slice(0, 5);
  
  ordersList.innerHTML = recentOrders.map(order => {
    const date = new Date(order.createdAt);
    const dateStr = date.toLocaleDateString('uz-UZ');
    const timeStr = date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
    
    const paymentIcon = order.paymentMethod === 'payme' ? '💳 Payme' : 
                       order.paymentMethod === 'click' ? '💳 Click' : '💵 Naqd';
    
    return `
      <div class="order-item" style="border-bottom: 1px solid #eee; padding: 10px 0; margin-bottom: 10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
          <span style="font-weight:600; color:#ff6600;">${order.total?.toLocaleString()} so'm</span>
          <span style="font-size:11px; color:#666;">${paymentIcon}</span>
        </div>
        <div style="font-size: 13px; color: #333; margin-bottom: 4px;">
          ${order.items.map(i => i.name).join(', ')}
        </div>
        <div style="font-size: 12px; color: #888;">
          ${dateStr} ${timeStr}
        </div>
        <div style="font-size: 12px; margin-top: 4px; padding: 2px 8px; border-radius: 4px; display: inline-block; ${
          order.status === 'pending' ? 'background: #fff3e0; color: #ff6600;' : 
          order.status === 'accepted' ? 'background: #e8f5e9; color: #2e7d32;' : 
          'background: #ffebee; color: #c62828;'
        }">
          ${order.status === 'pending' ? 'Kutilmoqda' : 
            order.status === 'accepted' ? 'Qabul qilindi' : 
            order.status === 'rejected' ? 'Bekor qilindi' : 'Yetkazildi'}
        </div>
        ${order.paymentStatus === 'paid' ? '<span style="color:#00c853; font-size:11px; margin-left:8px;">✅ To\'langan</span>' : ''}
      </div>
    `;
  }).join('');
}

saveProf.addEventListener('click', async () => {
  const name = inpName.value.trim();
  const phone = inpPhone.value.trim();
  
  if (!name || !phone) {
    alert('Iltimos, hammasini to\'ldiring!');
    return;
  }
  
  if (phone.length !== 9) {
    alert('Telefon 9 ta raqamdan iborat bo\'lishi kerak!');
    return;
  }
  
  try {
    await saveProfileDB({ name, phone });
    alert('✅ Saqlandi!');
  } catch (error) {
    alert('Xatolik!');
  }
});

[inpPhone, modalPhone].forEach(input => {
  if (input) {
    input.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 9);
    });
  }
});

console.log('🎉 App initialized');
