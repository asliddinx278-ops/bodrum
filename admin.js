// ===== ADMIN PANEL JAVASCRIPT =====
let tg = null;
let currentOrderId = null;
let orders = [];
let API_URL = localStorage.getItem('bodrum_api_url') || 'http://localhost:5000';

// Initialize
async function init() {
  console.log('🚀 Admin panel initializing...');
  
  if (window.Telegram && window.Telegram.WebApp) {
    tg = window.Telegram.WebApp;
    tg.expand();
    tg.ready();
    
    tg.setHeaderColor('#ff6600');
    tg.setBackgroundColor('#0f0f0f');
    
    // Haptic feedback test
    if (tg.HapticFeedback) {
      tg.HapticFeedback.impactOccurred('light');
    }
  }
  
  // Birinchi localStorage dan yuklash (tez ko'rinish uchun)
  loadFromLocalStorage();
  
  // Keyin API dan yuklash (real ma'lumot uchun)
  await loadFromAPI();
  
  // Polling boshlash
  startPolling();
  
  // Notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
  
  console.log('✅ Admin panel ready');
}

// LocalStorage dan yuklash
function loadFromLocalStorage() {
  try {
    const saved = localStorage.getItem('bodrum_admin_orders');
    if (saved) {
      orders = JSON.parse(saved);
      renderOrders();
      console.log('📦 Loaded from localStorage:', orders.length, 'orders');
    }
  } catch (e) {
    console.error('localStorage error:', e);
  }
}

// API dan buyurtmalarni yuklash
async function loadFromAPI() {
  try {
    console.log('🌐 Loading from API...');
    const response = await fetch(`${API_URL}/api/orders`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    
    if (data.success && data.orders) {
      // Yangi buyurtmalarni tekshirish
      const currentIds = new Set(orders.map(o => o.id));
      const newOrders = data.orders.filter(o => !currentIds.has(o.id));
      
      if (newOrders.length > 0) {
        console.log('🔔 New orders found:', newOrders.length);
        newOrders.forEach(order => {
          playNotificationSound();
          showNotification(order);
        });
      }
      
      // Ma'lumotlarni yangilash
      orders = data.orders.map(o => ({
        ...o,
        createdAt: o.created_at || o.createdAt,
        status: o.status || 'pending'
      }));
      
      saveToLocalStorage();
      renderOrders();
      console.log('✅ API loaded:', orders.length, 'orders');
    }
  } catch (error) {
    console.warn('⚠️ API unavailable, using localStorage:', error.message);
    // API ishlamasa, localStorage dan ishlatishda davom etamiz
  }
}

// Yangi buyurtmalarni tekshirish (polling)
async function checkNewOrders() {
  try {
    const response = await fetch(`${API_URL}/api/orders/new`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) return;
    
    const data = await response.json();
    
    if (data.success && data.orders && data.orders.length > 0) {
      const currentIds = new Set(orders.map(o => o.id));
      const newOrders = data.orders.filter(o => !currentIds.has(o.id));
      
      if (newOrders.length > 0) {
        console.log('🆕 New orders:', newOrders.length);
        
        newOrders.forEach(order => {
          order.createdAt = order.created_at || new Date().toISOString();
          order.status = 'pending';
          orders.unshift(order);
          
          // Notification
          playNotificationSound();
          showNotification(order);
          
          // Telegram popup
          if (tg && tg.showPopup) {
            tg.showPopup({
              title: '🛎️ Yangi buyurtma!',
              message: `${order.name}\n${order.total.toLocaleString()} so'm`,
              buttons: [
                { id: 'view', type: 'default', text: "Ko'rish" },
                { id: 'close', type: 'cancel', text: 'Yopish' }
              ]
            }, (btnId) => {
              if (btnId === 'view') {
                openOrderModal(order.id);
              }
            });
          }
          
          // Haptic feedback
          if (tg && tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
          }
        });
        
        saveToLocalStorage();
        renderOrders();
      }
    }
  } catch (error) {
    // API xatosi konsolda ko'rsatilmaydi (har 3 sekundda xato chiqmasligi uchun)
  }
}

// Polling boshlash
function startPolling() {
  checkNewOrders(); // Birinchi marta darhol tekshirish
  setInterval(checkNewOrders, 3000); // Har 3 sekundda
  console.log('🔄 Polling started (3s interval)');
}

// LocalStorage ga saqlash
function saveToLocalStorage() {
  try {
    localStorage.setItem('bodrum_admin_orders', JSON.stringify(orders));
  } catch (e) {
    console.error('Save error:', e);
  }
}

// Notification sound
function playNotificationSound() {
  try {
    const sound = document.getElementById('notifySound');
    if (sound) {
      sound.currentTime = 0;
      sound.volume = 0.5;
      sound.play().catch(e => {}); // Autoplay block ni silent qilish
    }
  } catch (e) {}
}

// Browser notification
function showNotification(order) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🛎️ Yangi buyurtma!', {
        body: `${order.name} - ${order.total.toLocaleString()} so'm`,
        icon: 'https://i.ibb.co/sJtWCn5M/images-1.jpg',
        tag: `order-${order.id}`,
        requireInteraction: true
      });
    }
  } catch (e) {}
}

// Render orders
function renderOrders() {
  const newOrders = orders.filter(o => o.status === 'pending');
  const acceptedOrders = orders.filter(o => o.status === 'accepted');
  
  // Stats
  document.getElementById('newOrdersCount').textContent = newOrders.length;
  document.getElementById('totalOrdersCount').textContent = orders.length;
  
  // New orders
  const newList = document.getElementById('newOrdersList');
  if (newOrders.length === 0) {
    newList.innerHTML = '<div class="empty-state">Yangi buyurtmalar yo\'q</div>';
  } else {
    newList.innerHTML = newOrders.map(order => createOrderCard(order)).join('');
  }
  
  // Accepted orders (faqat oxirgi 5 ta)
  const acceptedList = document.getElementById('acceptedOrdersList');
  const recentAccepted = acceptedOrders.slice(0, 5);
  if (recentAccepted.length === 0) {
    acceptedList.innerHTML = '<div class="empty-state">Qabul qilingan buyurtmalar yo\'q</div>';
  } else {
    acceptedList.innerHTML = recentAccepted.map(order => createOrderCard(order)).join('');
  }
  
  // Click handlers
  document.querySelectorAll('.order-card').forEach(card => {
    card.addEventListener('click', () => openOrderModal(parseInt(card.dataset.orderId)));
  });
}

// Create order card
function createOrderCard(order) {
  const date = new Date(order.createdAt);
  const timeStr = date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  const itemsPreview = order.items && order.items.length > 0 
    ? order.items.map(i => `${i.name} x${i.qty}`).join(', ') 
    : "Noma'lum";
  
  return `
    <div class="order-card ${order.status}" data-order-id="${order.id}">
      <div class="order-header">
        <span class="order-id">#${order.id}</span>
        <span class="order-time">${timeStr}</span>
      </div>
      <div class="order-customer">${order.name || "Noma'lum"}</div>
      <div class="order-phone">+998${order.phone || '_________'}</div>
      <div class="order-items-preview">${itemsPreview}</div>
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

// Open modal
function openOrderModal(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;
  
  currentOrderId = orderId;
  
  document.getElementById('modalOrderId').textContent = order.id;
  document.getElementById('modalCustomer').textContent = order.name || "Noma'lum";
  document.getElementById('modalPhone').textContent = '+998' + (order.phone || '_________');
  document.getElementById('modalTotal').textContent = (order.total || 0).toLocaleString() + " so'm";
  
  const date = new Date(order.createdAt);
  document.getElementById('modalTime').textContent = date.toLocaleString('uz-UZ');
  
  // Location
  const locationEl = document.getElementById('modalLocation');
  if (order.location && order.location.includes(',')) {
    const [lat, lng] = order.location.split(',');
    locationEl.href = `https://maps.google.com/?q=${lat.trim()},${lng.trim()}`;
    locationEl.style.display = 'inline';
    locationEl.textContent = "Xaritada ko'rish";
  } else {
    locationEl.style.display = 'none';
  }
  
  // Items
  const itemsHtml = order.items && order.items.length > 0
    ? order.items.map(item => `
        <li>
          <span class="item-name">${item.name}</span>
          <span class="item-qty">x${item.qty}</span>
          <span class="item-price">${((item.price || 0) * item.qty).toLocaleString()} so'm</span>
        </li>
      `).join('')
    : "<li>Mahsulotlar yo'q</li>";
  document.getElementById('modalItems').innerHTML = itemsHtml;
  
  // Actions
  const actionsDiv = document.getElementById('modalActions');
  actionsDiv.style.display = order.status === 'pending' ? 'flex' : 'none';
  
  document.getElementById('orderModal').classList.add('show');
}

// Close modal
function closeModal() {
  document.getElementById('orderModal').classList.remove('show');
  currentOrderId = null;
}

// Accept order
async function acceptOrder() {
  if (!currentOrderId) return;
  
  showLoading(true);
  
  try {
    const response = await fetch(`${API_URL}/api/orders/${currentOrderId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'accepted' })
    });
    
    const data = await response.json();
    
    if (data.success) {
      const order = orders.find(o => o.id === currentOrderId);
      if (order) {
        order.status = 'accepted';
        order.acceptedAt = new Date().toISOString();
        saveToLocalStorage();
        renderOrders();
        
        // Send to bot
        sendToBot({
          action: 'order_accepted',
          orderId: order.id,
          userId: order.tg_id || order.user_id
        });
        
        showToast("✅ Buyurtma qabul qilindi!");
      }
    } else {
      showToast("❌ Xatolik: " + (data.error || "Noma'lum"));
    }
  } catch (error) {
    console.error('Accept error:', error);
    // Offline mode
    const order = orders.find(o => o.id === currentOrderId);
    if (order) {
      order.status = 'accepted';
      order.acceptedAt = new Date().toISOString();
      saveToLocalStorage();
      renderOrders();
      sendToBot({
        action: 'order_accepted',
        orderId: order.id,
        userId: order.tg_id || order.user_id
      });
      showToast("✅ Qabul qilindi (offline)");
    }
  }
  
  showLoading(false);
  closeModal();
}

// Reject order
async function rejectOrder() {
  if (!currentOrderId) return;
  if (!confirm('Buyurtmani bekor qilishni xohlaysizmi?')) return;
  
  showLoading(true);
  
  try {
    const response = await fetch(`${API_URL}/api/orders/${currentOrderId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected' })
    });
    
    const data = await response.json();
    
    if (data.success) {
      const order = orders.find(o => o.id === currentOrderId);
      if (order) {
        order.status = 'rejected';
        order.rejectedAt = new Date().toISOString();
        saveToLocalStorage();
        renderOrders();
        
        sendToBot({
          action: 'order_rejected',
          orderId: order.id,
          userId: order.tg_id || order.user_id
        });
        
        showToast('❌ Buyurtma bekor qilindi');
      }
    }
  } catch (error) {
    console.error('Reject error:', error);
    // Offline
    const order = orders.find(o => o.id === currentOrderId);
    if (order) {
      order.status = 'rejected';
      order.rejectedAt = new Date().toISOString();
      saveToLocalStorage();
      renderOrders();
      showToast('❌ Bekor qilindi (offline)');
    }
  }
  
  showLoading(false);
  closeModal();
}

// Send to bot
function sendToBot(data) {
  try {
    if (tg && tg.sendData) {
      tg.sendData(JSON.stringify(data));
    }
  } catch (e) {
    console.log('sendData failed:', e);
  }
}

// Loading indicator
function showLoading(show) {
  if (show) {
    document.body.style.cursor = 'wait';
  } else {
    document.body.style.cursor = 'default';
  }
}

// Toast notification
function showToast(message) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%);
    background: #333;
    color: #fff;
    padding: 12px 24px;
    border-radius: 8px;
    z-index: 9999;
    font-size: 14px;
    animation: fadeInUp 0.3s ease;
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

// Initialize
document.addEventListener('DOMContentLoaded', init);

// Close modal on backdrop
document.getElementById('orderModal').addEventListener('click', (e) => {
  if (e.target.id === 'orderModal') closeModal();
});

// ESC key to close
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translate(-50%, 20px); }
    to { opacity: 1; transform: translate(-50%, 0); }
  }
`;
document.head.appendChild(style);