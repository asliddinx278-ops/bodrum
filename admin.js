import { db, ref, onValue, update } from './firebase-config.js';

let tg = null;
let currentOrderKey = null;
let orders = [];

function init() {
  console.log('🚀 Admin panel initializing...');
  
  if (window.Telegram?.WebApp) {
    tg = window.Telegram.WebApp;
    tg.expand();
    tg.ready();
    console.log('✅ Telegram WebApp loaded');
  }
  
  listenToOrders();
  console.log('✅ Admin panel ready');
}

// Firebase dan real-time tinglash
function listenToOrders() {
  console.log('👂 Firebase dan tinglanmoqda...');
  const ordersRef = ref(db, 'orders');
  
  onValue(ordersRef, (snapshot) => {
    const data = snapshot.val();
    console.log('📥 Firebase dan ma\'lumot:', data ? 'Keldi' : 'Bo\'sh');
    
    if (data) {
      // Object dan Array ga aylantirish
      const ordersArray = Object.entries(data).map(([key, value]) => ({
        firebaseKey: key,
        ...value
      })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // Yangi buyurtma tekshirish (birinchi marta emas)
      if (orders.length > 0) {
        const oldKeys = new Set(orders.map(o => o.firebaseKey));
        const newOrders = ordersArray.filter(o => !oldKeys.has(o.firebaseKey) && o.status === 'pending');
        
        newOrders.forEach(order => {
          playNotificationSound();
          if (tg?.showPopup) {
            tg.showPopup({
              title: '🛎️ Yangi buyurtma!',
              message: `${order.name} - ${order.total?.toLocaleString()} so'm`,
              buttons: [{ id: 'view', type: 'default', text: "Ko'rish" }, { id: 'close', type: 'cancel', text: 'Yopish' }]
            }, (btnId) => {
              if (btnId === 'view') openOrderModal(order.firebaseKey);
            });
          }
        });
      }
      
      orders = ordersArray;
      renderOrders();
    } else {
      orders = [];
      renderOrders();
    }
  }, (error) => {
    console.error('❌ Firebase xato:', error.message);
    if (error.message.includes('permission_denied')) {
      alert('❌ Ruxsat yo\'q! Firebase Rules ni oching');
    }
  });
}

function renderOrders() {
  const newOrders = orders.filter(o => o.status === 'pending');
  const acceptedOrders = orders.filter(o => o.status === 'accepted');
  
  document.getElementById('newOrdersCount').textContent = newOrders.length;
  document.getElementById('totalOrdersCount').textContent = orders.length;
  
  // Yangi buyurtmalar
  const newList = document.getElementById('newOrdersList');
  if (newOrders.length === 0) {
    newList.innerHTML = '<div class="empty-state">Yangi buyurtmalar yo\'q</div>';
  } else {
    newList.innerHTML = newOrders.map(order => createOrderCard(order)).join('');
  }
  
  // Qabul qilinganlar
  const acceptedList = document.getElementById('acceptedOrdersList');
  const recentAccepted = acceptedOrders.slice(0, 5);
  if (recentAccepted.length === 0) {
    acceptedList.innerHTML = '<div class="empty-state">Qabul qilingan buyurtmalar yo\'q</div>';
  } else {
    acceptedList.innerHTML = recentAccepted.map(order => createOrderCard(order)).join('');
  }
  
  // Click eventlar
  document.querySelectorAll('.order-card').forEach(card => {
    card.addEventListener('click', () => openOrderModal(card.dataset.orderId));
  });
}

function createOrderCard(order) {
  const date = new Date(order.createdAt);
  const timeStr = date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  const itemsPreview = order.items?.map(i => `${i.name} x${i.qty}`).join(', ') || "Noma'lum";
  const hasLocation = order.location && order.location.includes(',');
  
  const paymentMethod = order.paymentMethod || 'cash';
  const paymentStatus = order.paymentStatus || 'pending';
  const paymentText = paymentMethod === 'payme' ? '💳 Payme' : paymentMethod === 'click' ? '💳 Click' : '💵 Naqd';
  
  return `
    <div class="order-card ${order.status === 'pending' ? 'new' : ''}" data-order-id="${order.firebaseKey}">
      <div class="order-header">
        <span class="order-id">#${order.firebaseKey.slice(-6)}</span>
        <span class="order-time">${timeStr}</span>
      </div>
      <div class="order-customer">${order.name || "Noma'lum"}</div>
      <div class="order-phone">+998${order.phone || '_________'} ${hasLocation ? '📍' : ''}</div>
      <div class="order-items-preview">${itemsPreview}</div>
      <div style="margin-bottom:8px;">
        <span class="payment-status ${paymentStatus === 'paid' ? 'paid' : 'pending'}">
          ${paymentStatus === 'paid' ? '✅' : '⏳'} ${paymentText}
        </span>
      </div>
      <div class="order-footer">
        <span class="order-total">${(order.total || 0).toLocaleString()} so'm</span>
        <span class="order-status ${order.status}">${getStatusText(order.status)}</span>
      </div>
    </div>
  `;
}

function getStatusText(status) {
  const texts = {
    'pending': 'Yangi',
    'accepted': 'Qabul qilindi',
    'rejected': 'Bekor qilindi'
  };
  return texts[status] || status;
}

function openOrderModal(orderId) {
  const order = orders.find(o => o.firebaseKey === orderId);
  if (!order) return;
  
  currentOrderKey = orderId;
  
  document.getElementById('modalOrderId').textContent = orderId.slice(-6);
  document.getElementById('modalCustomer').textContent = order.name || "Noma'lum";
  document.getElementById('modalPhone').textContent = '+998' + (order.phone || '_________');
  document.getElementById('modalTotal').textContent = (order.total || 0).toLocaleString() + " so'm";
  
  const date = new Date(order.createdAt);
  document.getElementById('modalTime').textContent = date.toLocaleString('uz-UZ');
  
  // To'lov
  const paymentMethod = order.paymentMethod || 'cash';
  const paymentStatus = order.paymentStatus || 'pending';
  document.getElementById('modalPayment').textContent = 
    `${paymentStatus === 'paid' ? '✅' : '⏳'} ${paymentMethod.toUpperCase()}`;
  
  // Joylashuv
  const locationEl = document.getElementById('modalLocation');
  if (order.location && order.location.includes(',')) {
    const [lat, lng] = order.location.split(',');
    locationEl.href = `https://maps.google.com/?q=${lat.trim()},${lng.trim()}`;
    locationEl.style.display = 'inline';
  } else {
    locationEl.style.display = 'none';
  }
  
  // Mahsulotlar
  const itemsHtml = order.items?.map(item => `
    <li>
      <span class="item-name">${item.name}</span>
      <span class="item-qty">x${item.qty}</span>
      <span class="item-price">${((item.price || 0) * item.qty).toLocaleString()} so'm</span>
    </li>
  `).join('') || "<li>Mahsulotlar yo'q</li>";
  document.getElementById('modalItems').innerHTML = itemsHtml;
  
  // Tugmalar
  document.getElementById('modalActions').style.display = order.status === 'pending' ? 'flex' : 'none';
  
  document.getElementById('orderModal').classList.add('show');
}

async function acceptOrder() {
  if (!currentOrderKey) return;
  
  try {
    await update(ref(db, `orders/${currentOrderKey}`), { 
      status: 'accepted',
      acceptedAt: new Date().toISOString()
    });
    showToast("✅ Buyurtma qabul qilindi!");
    closeModal();
  } catch (error) {
    console.error('Error:', error);
    showToast("❌ Xatolik");
  }
}

async function rejectOrder() {
  if (!currentOrderKey || !confirm('Bekor qilishni tasdiqlaysizmi?')) return;
  
  try {
    await update(ref(db, `orders/${currentOrderKey}`), { 
      status: 'rejected',
      rejectedAt: new Date().toISOString()
    });
    showToast('❌ Bekor qilindi');
    closeModal();
  } catch (error) {
    console.error('Error:', error);
  }
}

function playNotificationSound() {
  const sound = document.getElementById('notifySound');
  if (sound) {
    sound.currentTime = 0;
    sound.play().catch(e => {});
  }
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
    background: #333; color: #fff; padding: 12px 24px; border-radius: 8px;
    z-index: 9999; font-size: 14px; animation: fadeInUp 0.3s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

function closeModal() {
  document.getElementById('orderModal').classList.remove('show');
  currentOrderKey = null;
}

// Global functions
window.acceptOrder = acceptOrder;
window.rejectOrder = rejectOrder;
window.closeModal = closeModal;

// Events
document.addEventListener('DOMContentLoaded', init);
document.getElementById('orderModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'orderModal') closeModal();
});
