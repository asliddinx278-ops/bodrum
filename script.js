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

// ---------- 2. INDEXEDDB (Profile uchun) ----------
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
    console.log('✅ Profile saved');
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
    console.log('Profile:', result);
    return result;
  } catch (error) {
    console.error('❌ Error:', error);
    return null;
  }
}

// ---------- 3. LOCALSTORAGE (savat) ----------
const CART_KEY = 'bodrum_cart';

function saveCartLS() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  console.log('💾 Cart saved:', cart.length, 'items');
}

function loadCartLS() {
  const raw = localStorage.getItem(CART_KEY);
  cart = raw ? JSON.parse(raw) : [];
  console.log('📦 Cart loaded:', cart.length, 'items');
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
    console.log('➕ Added:', product.name);
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

// Joylashuvni olish funksiyasi
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
        console.error('Geolocation error:', error);
        reject(error);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

// Buyurtma berish - Yangilangan versiya
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
  
  // Joylashuvni so'rash
  orderBtn.disabled = true;
  orderBtn.textContent = 'Joylashuv aniqlanmoqda...';
  
  try {
    // Joylashuvni olish
    const location = await requestLocation();
    
    orderBtn.textContent = 'Buyurtma saqlanmoqda...';
    
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    
    // Buyurtma obyektini yaratish
    const order = {
      id: Date.now(), // Unique ID
      name: profile.name,
      phone: profile.phone,
      items: [...cart],
      total: total,
      status: 'pending', // Yangi buyurtma
      createdAt: new Date().toISOString(),
      location: location, // Joylashuv koordinatalari
      tg_id: tg?.initDataUnsafe?.user?.id || null
    };
    
    // LocalStorage dan mavjud buyurtmalarni olish
    const existingOrders = JSON.parse(localStorage.getItem('bodrum_admin_orders') || '[]');
    
    // Yangi buyurtmani boshiga qo'shish
    existingOrders.unshift(order);
    
    // LocalStorage ga saqlash (Admin panel avtomatik ko'radi)
    localStorage.setItem('bodrum_admin_orders', JSON.stringify(existingOrders));
    
    console.log('✅ Buyurtma saqlandi:', order);
    
    // Savatni tozalash
    cart = [];
    saveCartLS();
    renderCart();
    
    // Muvaffaqiyat xabari
    alert('✅ Buyurtma qabul qilindi!\n\nOperator tez orada siz bilan bog\'lanadi.');
    
    // Profil tabiga o'tish (buyurtmalar tarixi ko'rinadi)
    document.querySelector('[data-tab="profile"]').click();
    
  } catch (error) {
    console.error('Xato:', error);
    alert('❌ Joylashuvni aniqlashda xatolik yuz berdi.\n\nIltimos, joylashuv ruxsatini bering va qayta urinib ko\'ring.\n\nAgar muammo takrorlansa, telefon orqali bog\'laning.');
  } finally {
    orderBtn.disabled = false;
    orderBtn.textContent = 'Buyurtma berish';
  }
});

// ---------- 7. PROFILE ----------
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

// Profile tab
const inpName = document.getElementById('inpName');
const inpPhone = document.getElementById('inpPhone');
const saveProf = document.getElementById('saveProf');

document.querySelector('[data-tab="profile"]').addEventListener('click', async () => {
  const profile = await getProfileDB();
  if (profile) {
    inpName.value = profile.name || '';
    inpPhone.value = profile.phone || '';
  }
  
  // Buyurtmalarni ko'rsatish (localStorage dan)
  renderUserOrders();
});

function renderUserOrders() {
  const ordersList = document.getElementById('ordersList');
  const allOrders = JSON.parse(localStorage.getItem('bodrum_admin_orders') || '[]');
  
  // Foydalanuvchini buyurtmalarini filterlash (telefon raqami bo'yicha)
  const profile = { phone: inpPhone.value };
  
  if (allOrders.length === 0) {
    ordersList.innerHTML = 'Hali buyurtma yo\'q';
    return;
  }
  
  // Oxirgi 5 buyurtmani ko'rsatish
  const recentOrders = allOrders.slice(0, 5);
  
  ordersList.innerHTML = recentOrders.map(order => {
    const date = new Date(order.createdAt);
    const dateStr = date.toLocaleDateString('uz-UZ');
    const timeStr = date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
    const itemsText = order.items ? order.items.map(i => i.name).join(', ') : '';
    
    return `
      <div class="order-item" style="border-bottom: 1px solid #eee; padding: 10px 0; margin-bottom: 10px;">
        <div style="font-weight: 600; color: #ff6600; margin-bottom: 4px;">
          ${order.total?.toLocaleString() || 0} so'm
        </div>
        <div style="font-size: 13px; color: #333; margin-bottom: 4px;">
          ${itemsText}
        </div>
        <div class="order-date" style="font-size: 12px; color: #888;">
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

// Phone format
[inpPhone, modalPhone].forEach(input => {
  if (input) {
    input.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 9);
    });
  }
});

// Profil mavjudligini tekshirish (birinchi marta)
window.addEventListener('load', async () => {
  const profile = await getProfileDB();
  if (!profile) {
    // Profil bo'lmasa modal ochish (ixtiyoriy)
    // openProfModal();
  }
});

console.log('🎉 App initialized');
