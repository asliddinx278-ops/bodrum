import { db, ref, onValue, update, remove } from './firebase-config.js';

let tg = null;
let currentOrderId = null;
let orders = [];

function init() {
  console.log('🚀 Admin panel initializing...');
  
  if (window.Telegram?.WebApp) {
    tg = window.Telegram.WebApp;
    tg.expand();
    tg.ready();
    tg.HapticFeedback?.impactOccurred('light');
  }
  
  // Firebase real-time tinglash
  listenToOrders();
  
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
  
  console.log('✅ Admin panel ready');
}

// Firebase dan real-time buyurtmalarni olish
function listenToOrders() {
  const ordersRef = ref(db, 'orders');
  
  onValue(ordersRef, (snapshot) => {
    const data = snapshot.val();
    
    if (data) {
      // Object dan Array ga aylantirish
      const ordersArray = Object.entries(data).map(([key, value]) => ({
        firebaseKey: key,
        ...value
      })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // Yangi buyurtma tekshirish
      const oldOrderIds = new Set(orders.map(o => o.firebaseKey));
      const newOrders = ordersArray.filter(o => !oldOrderIds.has(o.firebaseKey) && o.status === 'pending');
      
      if (newOrders.length > 0 && orders.length > 0) {
        // Yangi buyurtma keldi!
        newOrders.forEach(order => {
          playNotificationSound();
          showNotification(order);
          
          if (tg?.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
          }
          
          if (tg?.showPopup) {
            tg.showPopup({
              title: '🛎️ Yangi buyurtma!',
              message: `${order.name} - ${order.total?.toLocaleString()} so'm\n📱 +998${order.phone}\n💳 ${order.paymentMethod || 'Naqd'}`,
              buttons: [
                { id: 'view', type: 'default', text: "Ko'rish" },
                { id: 'close', type: 'cancel', text: 'Yopish' }
              ]
            }, (btnId) => {
              if (btnId === 'view') openOrderModal(order.firebaseKey);
            });
          }
        });
      }
      
      orders = ordersArray;
      renderOrders();
      console.log('📦 Orders updated:', orders.length);
    } else {
      orders = [];
      renderOrders();
    }
  }, (error) => {
    console.error('Firebase error:', error);
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
  
  // Qabul qilinganlar (oxirgi 10 ta)
  const acceptedList = document.getElementById('acceptedOrdersList');
  const recentAccepted = acceptedOrders.slice(0, 10);
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
  const paymentText = paymentMethod === 'payme' ? 'Payme' : paymentMethod === 'click' ? 'Click' : 'Naqd';
  
  // Vaqt formati
  const dateStr = date.toLocaleDateString('uz-UZ');
  
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
    'rejected': 'Bekor qilindi',
    'delivered': 'Yetkazildi'
  };
  return texts[status] || status;
}

function openOrderModal(orderId) {
  const order = orders.find(o => o.firebaseKey === orderId);
  if (!order) return;
  
  currentOrderId = orderId;
  
  document.getElementById('modalOrderId').textContent = orderId.slice(-6);
  document.getElementById('modalCustomer').textContent = order.name || "Noma'lum";
  document.getElementById('modalPhone').textContent = '+998' + (order.phone || '_________');
  document.getElementById('modalTotal').textContent = (order.total || 0).toLocaleString() + " so'm";
  
  const date = new Date(order.createdAt);
  document.getElementById('modalTime').textContent = date.toLocaleString('uz-UZ');
  
  // Joylashuv
  const locationEl = document.getElementById('modalLocation');
  if (order.location && order.location.includes(',')) {
    const [lat, lng] = order.location.split(',');
    locationEl.href = `https://maps.google.com/?q=${lat.trim()},${lng.trim()}`;
    locationEl.style.display = 'inline';
    locationEl.textContent = "Xaritada ko'rish";
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
  
  // Tugmalar (faqat pending bo'lsa)
  const actionsDiv = document.getElementById('modalActions');
  actionsDiv.style.display = order.status === 'pending' ? 'flex' : 'none';
  
  document.getElementById('orderModal').classList.add('show');
}

// Firebase da statusni yangilash
async function acceptOrder() {
  if (!currentOrderId) return;
  
  try {
    const orderRef = ref(db, `orders/${currentOrderId}`);
    await update(orderRef, { 
      status: 'accepted',
      acceptedAt: new Date().toISOString()
    });
    
    showToast("✅ Buyurtma qabul qilindi!");
    closeModal();
    
  } catch (error) {
    console.error('Error:', error);
    showToast("❌ Xatolik: " + error.message);
  }
}

async function rejectOrder() {
  if (!currentOrderId) return;
  if (!confirm('Buyurtmani bekor qilishni xohlaysizmi?')) return;
  
  try {
    const orderRef = ref(db, `orders/${currentOrderId}`);
    await update(orderRef, { 
      status: 'rejected',
      rejectedAt: new Date().toISOString()
    });
    
    showToast('❌ Buyurtma bekor qilindi');
    closeModal();
  } catch (error) {
    console.error('Error:', error);
    showToast("❌ Xatolik: " + error.message);
  }
}

// Bildirishnomalar
function playNotificationSound() {
  try {
    const sound = document.getElementById('notifySound');
    if (sound) {
      sound.currentTime = 0;
      sound.volume = 0.5;
      sound.play().catch(e => {});
    }
  } catch (e) {}
}

function showNotification(order) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🛎️ Yangi buyurtma!', {
        body: `${order.name} - ${order.total?.toLocaleString()} so'm`,
        icon: 'https://i.ibb.co/sJtWCn5M/images-1.jpg',
        tag: order.firebaseKey,
        requireInteraction: true
      });
    }
  } catch (e) {}
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
    background: #333; color: #fff; padding: 12px 24px; border-radius: 8px;
    z-index: 9999; font-size: 14px; animation: fadeInUp 0.3s ease;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

function closeModal() {
  document.getElementById('orderModal').classList.remove('show');
  currentOrderId = null;
}

// Global scoped functions (HTML dan chaqirish uchun)
window.acceptOrder = acceptOrder;
window.rejectOrder = rejectOrder;
window.closeModal = closeModal;

// Event listeners
document.addEventListener('DOMContentLoaded', init);
document.getElementById('orderModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'orderModal') closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// CSS animation
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translate(-50%, 20px); }
    to { opacity: 1; transform: translate(-50%, 0); }
  }
`;
document.head.appendChild(style);
