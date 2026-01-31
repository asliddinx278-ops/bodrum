import { db, ref, onValue, update, push, set, remove } from './firebase-config.js';

let tg = null;
let currentOrderKey = null;
let orders = [];
let menuItems = [];
let customers = [];
let revenueChart = null;
let productsChart = null;

// Initialize
function init() {
  console.log('🚀 Admin panel initializing...');
  
  if (window.Telegram?.WebApp) {
    tg = window.Telegram.WebApp;
    tg.expand();
    tg.ready();
  }
  
  listenToOrders();
  listenToMenu();
  listenToCustomers();
  updateStats();
  
  console.log('✅ Admin panel ready');
}

// Navigation
window.showSection = function(section) {
  // Remove active class from all nav items
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
  
  // Add active class to clicked nav item
  event.currentTarget.classList.add('active');
  
  // Show corresponding section
  document.getElementById(section + 'Section').classList.add('active');
  
  // Update stats if stats section
  if (section === 'stats') {
    updateStats();
  }
};

// Firebase Listeners
function listenToOrders() {
  const ordersRef = ref(db, 'orders');
  
  onValue(ordersRef, (snapshot) => {
    const data = snapshot.val();
    
    if (data) {
      orders = Object.entries(data).map(([key, value]) => ({
        firebaseKey: key,
        ...value
      })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // Check for new orders
      const oldOrders = JSON.parse(localStorage.getItem('orders') || '[]');
      const oldKeys = new Set(oldOrders.map(o => o.firebaseKey));
      const newOrders = orders.filter(o => !oldKeys.has(o.firebaseKey) && o.status === 'pending');
      
      if (newOrders.length > 0) {
        playNotificationSound();
        newOrders.forEach(order => {
          if (tg?.showPopup) {
            tg.showPopup({
              title: '🛎️ Yangi buyurtma!',
              message: `${order.name} - ${order.total?.toLocaleString()} so'm`,
              buttons: [{ id: 'view', type: 'default', text: "Ko'rish" }]
            }, (btnId) => {
              if (btnId === 'view') openOrderModal(order.firebaseKey);
            });
          }
        });
      }
      
      localStorage.setItem('orders', JSON.stringify(orders));
      renderOrders();
    }
  });
}

function listenToMenu() {
  const menuRef = ref(db, 'menu');
  onValue(menuRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      menuItems = Object.entries(data).map(([key, value]) => ({
        firebaseKey: key,
        ...value
      }));
      renderMenu();
    } else {
      // Default menu if empty
      menuItems = [
        { id: 1, name: 'Klyukva-Burger kombo', price: 64000, category: 'combo', image: 'https://i.ibb.co/sJtWCn5M/images-1.jpg', available: true },
        { id: 2, name: 'Klyukva-Lavash kombo', price: 59000, category: 'combo', image: 'https://i.ibb.co/sJtWCn5M/images-1.jpg', available: true },
        { id: 3, name: 'Klyukva-Burger', price: 44000, category: 'burger', image: 'https://i.ibb.co/sJtWCn5M/images-1.jpg', available: true }
      ];
      renderMenu();
    }
  });
}

function listenToCustomers() {
  const customersRef = ref(db, 'orders');
  onValue(customersRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const customerMap = new Map();
      
      Object.values(data).forEach(order => {
        const key = order.phone;
        if (!customerMap.has(key)) {
          customerMap.set(key, {
            name: order.name,
            phone: order.phone,
            orders: 0,
            totalSpent: 0,
            lastOrder: order.createdAt
          });
        }
        const customer = customerMap.get(key);
        customer.orders++;
        customer.totalSpent += order.total || 0;
        if (new Date(order.createdAt) > new Date(customer.lastOrder)) {
          customer.lastOrder = order.createdAt;
        }
      });
      
      customers = Array.from(customerMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);
      renderCustomers();
    }
  });
}

// Render Functions
function renderOrders() {
  const newOrders = orders.filter(o => o.status === 'pending');
  const acceptedOrders = orders.filter(o => o.status === 'accepted');
  const today = new Date().toDateString();
  const todayTotal = orders
    .filter(o => new Date(o.createdAt).toDateString() === today && o.status === 'accepted')
    .reduce((sum, o) => sum + (o.total || 0), 0);
  
  document.getElementById('newOrdersCount').textContent = newOrders.length;
  document.getElementById('acceptedOrdersCount').textContent = acceptedOrders.length;
  document.getElementById('todayTotal').textContent = todayTotal.toLocaleString();
  document.getElementById('ordersBadge').textContent = newOrders.length;
  
  // New orders
  const newList = document.getElementById('newOrdersList');
  if (newOrders.length === 0) {
    newList.innerHTML = '<div class="empty-state">Yangi buyurtmalar yo\'q</div>';
  } else {
    newList.innerHTML = newOrders.map(order => createOrderCard(order)).join('');
  }
  
  // Accepted orders
  const acceptedList = document.getElementById('acceptedOrdersList');
  const recentAccepted = acceptedOrders.slice(0, 10);
  if (recentAccepted.length === 0) {
    acceptedList.innerHTML = '<div class="empty-state">Qabul qilingan buyurtmalar yo\'q</div>';
  } else {
    acceptedList.innerHTML = recentAccepted.map(order => createOrderCard(order)).join('');
  }
  
  // Click events
  document.querySelectorAll('.order-card').forEach(card => {
    card.addEventListener('click', () => openOrderModal(card.dataset.orderId));
  });
}

function createOrderCard(order) {
  const date = new Date(order.createdAt);
  const timeStr = date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  const itemsPreview = order.items?.map(i => `${i.name} x${i.qty}`).join(', ') || "Noma'lum";
  
  return `
    <div class="order-card ${order.status === 'pending' ? 'new' : ''}" data-order-id="${order.firebaseKey}">
      <div class="order-header">
        <span class="order-id">#${order.firebaseKey.slice(-6)}</span>
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
  const texts = { 'pending': 'Yangi', 'accepted': 'Qabul qilindi', 'rejected': 'Bekor qilindi' };
  return texts[status] || status;
}

// Menu Management
function renderMenu() {
  const grid = document.getElementById('menuGrid');
  const activeCategory = document.querySelector('.category-btn.active')?.dataset.cat || 'all';
  
  const filtered = activeCategory === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.category === activeCategory);
  
  if (filtered.length === 0) {
    grid.innerHTML = '<div class="empty-state">Bu kategoriyada mahsulot yo\'q</div>';
    return;
  }
  
  grid.innerHTML = filtered.map(item => `
    <div class="menu-item-card">
      <img src="${item.image}" alt="${item.name}" class="menu-item-image" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
      <div class="menu-item-info">
        <div class="menu-item-name">${item.name}</div>
        <div class="menu-item-price">${item.price.toLocaleString()} so'm</div>
        <span class="menu-item-badge ${item.available !== false ? 'badge-available' : 'badge-unavailable'}">
          ${item.available !== false ? '✅ Mavjud' : '❌ Mavjud emas'}
        </span>
        <div class="menu-item-actions" style="margin-top: 12px;">
          <button class="btn-small btn-edit" onclick="editMenuItem('${item.firebaseKey}')">✏️ Tahrirlash</button>
          <button class="btn-small btn-delete" onclick="deleteMenuItem('${item.firebaseKey}')">🗑 O'chirish</button>
        </div>
      </div>
    </div>
  `).join('');
}

// Category filter
document.querySelectorAll('.category-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderMenu();
  });
});

let editingMenuItem = null;

window.openMenuModal = function() {
  editingMenuItem = null;
  document.getElementById('menuModalTitle').textContent = 'Yangi mahsulot';
  document.getElementById('itemName').value = '';
  document.getElementById('itemPrice').value = '';
  document.getElementById('itemCategory').value = 'burger';
  document.getElementById('itemImage').value = '';
  document.getElementById('itemDesc').value = '';
  document.getElementById('itemAvailable').checked = true;
  document.getElementById('menuModal').classList.add('show');
};

window.editMenuItem = function(key) {
  const item = menuItems.find(m => m.firebaseKey === key);
  if (!item) return;
  
  editingMenuItem = key;
  document.getElementById('menuModalTitle').textContent = 'Mahsulotni tahrirlash';
  document.getElementById('itemName').value = item.name;
  document.getElementById('itemPrice').value = item.price;
  document.getElementById('itemCategory').value = item.category || 'burger';
  document.getElementById('itemImage').value = item.image || '';
  document.getElementById('itemDesc').value = item.description || '';
  document.getElementById('itemAvailable').checked = item.available !== false;
  document.getElementById('menuModal').classList.add('show');
};

window.saveMenuItem = async function() {
  const name = document.getElementById('itemName').value.trim();
  const price = parseInt(document.getElementById('itemPrice').value);
  const category = document.getElementById('itemCategory').value;
  const image = document.getElementById('itemImage').value.trim();
  const description = document.getElementById('itemDesc').value.trim();
  const available = document.getElementById('itemAvailable').checked;
  
  if (!name || !price) {
    alert('Nomi va narxni kiriting!');
    return;
  }
  
  const itemData = { name, price, category, image, description, available };
  
  try {
    if (editingMenuItem) {
      await update(ref(db, `menu/${editingMenuItem}`), itemData);
      showToast('✅ Mahsulot yangilandi');
    } else {
      const newRef = push(ref(db, 'menu'));
      await set(newRef, itemData);
      showToast('✅ Yangi mahsulot qo\'shildi');
    }
    closeMenuModal();
  } catch (error) {
    console.error('Error:', error);
    showToast('❌ Xatolik yuz berdi');
  }
};

window.deleteMenuItem = async function(key) {
  if (!confirm('Rostdan ham o\'chirmoqchimisiz?')) return;
  
  try {
    await remove(ref(db, `menu/${key}`));
    showToast('🗑 Mahsulot o\'chirildi');
  } catch (error) {
    showToast('❌ Xatolik');
  }
};

window.closeMenuModal = function() {
  document.getElementById('menuModal').classList.remove('show');
};

// Customers
function renderCustomers() {
  const tbody = document.getElementById('customersList');
  const searchTerm = document.getElementById('customerSearch')?.value.toLowerCase() || '';
  
  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm) || 
    c.phone.includes(searchTerm)
  );
  
  document.getElementById('totalCustomers').textContent = customers.length;
  document.getElementById('vipCustomers').textContent = customers.filter(c => c.orders >= 5).length;
  document.getElementById('customersBadge').textContent = customers.length;
  
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Mijozlar topilmadi</td></tr>';
    return;
  }
  
  tbody.innerHTML = filtered.map((c, index) => {
    const lastOrder = new Date(c.lastOrder).toLocaleDateString('uz-UZ');
    return `
      <tr>
        <td><div class="customer-name">${c.name}</div></td>
        <td><div class="customer-phone">+998${c.phone}</div></td>
        <td><span class="orders-count">${c.orders}</span></td>
        <td><div class="total-spent">${c.totalSpent.toLocaleString()} so'm</div></td>
        <td style="color: #888; font-size: 13px;">${lastOrder}</td>
        <td><button class="btn-view" onclick="viewCustomer('${c.phone}')">Ko'rish</button></td>
      </tr>
    `;
  }).join('');
}

window.searchCustomers = function() {
  renderCustomers();
};

window.viewCustomer = function(phone) {
  const customer = customers.find(c => c.phone === phone);
  const customerOrders = orders.filter(o => o.phone === phone).sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );
  
  const content = document.getElementById('customerDetailContent');
  content.innerHTML = `
    <div class="info-row">
      <span class="info-label">Ism:</span>
      <span class="info-value">${customer.name}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Telefon:</span>
      <span class="info-value">+998${customer.phone}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Jami buyurtmalar:</span>
      <span class="info-value">${customer.orders} ta</span>
    </div>
    <div class="info-row">
      <span class="info-label">Jami xarajat:</span>
      <span class="info-value price">${customer.totalSpent.toLocaleString()} so'm</span>
    </div>
    <div style="margin-top: 20px;">
      <h4 style="margin-bottom: 12px; color: #888;">Oxirgi buyurtmalar:</h4>
      ${customerOrders.slice(0, 5).map(o => `
        <div style="padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: 600;">#${o.firebaseKey.slice(-6)}</span>
            <span style="color: #00ff88;">${o.total.toLocaleString()} so'm</span>
          </div>
          <div style="font-size: 12px; color: #666;">
            ${new Date(o.createdAt).toLocaleString('uz-UZ')} | ${o.items.map(i => i.name).join(', ')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
  
  document.getElementById('customerModal').classList.add('show');
};

window.closeCustomerModal = function() {
  document.getElementById('customerModal').classList.remove('show');
};

// Statistics
window.updateStats = async function() {
  const period = document.getElementById('statsPeriod').value;
  const now = new Date();
  let startDate = new Date();
  
  if (period === 'today') {
    startDate.setHours(0, 0, 0, 0);
  } else if (period === 'week') {
    startDate.setDate(now.getDate() - 7);
  } else if (period === 'month') {
    startDate.setMonth(now.getMonth() - 1);
  }
  
  const filteredOrders = orders.filter(o => {
    const orderDate = new Date(o.createdAt);
    return orderDate >= startDate && orderDate <= now && o.status === 'accepted';
  });
  
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalOrders = filteredOrders.length;
  const avgCheck = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  
  // Top product
  const productCount = {};
  filteredOrders.forEach(o => {
    o.items.forEach(item => {
      productCount[item.name] = (productCount[item.name] || 0) + item.qty;
    });
  });
  
  const topProduct = Object.entries(productCount)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
  
  document.getElementById('statRevenue').textContent = totalRevenue.toLocaleString() + ' so\'m';
  document.getElementById('statOrders').textContent = totalOrders;
  document.getElementById('statAvgCheck').textContent = avgCheck.toLocaleString() + ' so\'m';
  document.getElementById('statTopItem').textContent = topProduct;
  
  // Render top products list
  const topList = Object.entries(productCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  const topContainer = document.getElementById('topProductsList');
  topContainer.innerHTML = '<h3>🏆 Top 5 mahsulot</h3>' + 
    topList.map((item, index) => {
      const total = filteredOrders.reduce((sum, o) => {
        const found = o.items.find(i => i.name === item[0]);
        return sum + (found ? found.price * found.qty : 0);
      }, 0);
      
      return `
        <div class="top-product-item">
          <div class="top-product-rank">${index + 1}</div>
          <div class="top-product-info">
            <div class="top-product-name">${item[0]}</div>
            <div class="top-product-count">${item[1]} ta sotildi</div>
          </div>
          <div class="top-product-total">${total.toLocaleString()} so'm</div>
        </div>
      `;
    }).join('');
  
  // Update charts
  updateCharts(filteredOrders, period);
};

function updateCharts(orders, period) {
  const ctx1 = document.getElementById('revenueChart');
  const ctx2 = document.getElementById('productsChart');
  
  if (!ctx1 || !ctx2) return;
  
  // Group by date
  const dateMap = {};
  orders.forEach(o => {
    const date = new Date(o.createdAt).toLocaleDateString('uz-UZ', { weekday: 'short' });
    dateMap[date] = (dateMap[date] || 0) + o.total;
  });
  
  if (revenueChart) revenueChart.destroy();
  if (productsChart) productsChart.destroy();
  
  revenueChart = new Chart(ctx1, {
    type: 'line',
    data: {
      labels: Object.keys(dateMap),
      datasets: [{
        label: 'Daromad (so\'m)',
        data: Object.values(dateMap),
        borderColor: '#ff6600',
        backgroundColor: 'rgba(255, 102, 0, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { grid: { color: '#333' }, ticks: { color: '#888' } },
        x: { grid: { display: false }, ticks: { color: '#888' } }
      }
    }
  });
  
  // Product chart
  const productCount = {};
  orders.forEach(o => {
    o.items.forEach(i => {
      productCount[i.name] = (productCount[i.name] || 0) + i.qty;
    });
  });
  
  const topProducts = Object.entries(productCount).slice(0, 5);
  
  productsChart = new Chart(ctx2, {
    type: 'doughnut',
    data: {
      labels: topProducts.map(p => p[0]),
      datasets: [{
        data: topProducts.map(p => p[1]),
        backgroundColor: ['#ff6600', '#ff8533', '#ffa366', '#ffc299', '#ffe0cc']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: '#fff', font: { size: 11 } } }
      }
    }
  });
}

// Order Modal Functions
window.openOrderModal = function(orderId) {
  const order = orders.find(o => o.firebaseKey === orderId);
  if (!order) return;
  
  currentOrderKey = orderId;
  
  document.getElementById('modalOrderId').textContent = orderId.slice(-6);
  document.getElementById('modalCustomer').textContent = order.name || "Noma'lum";
  document.getElementById('modalPhone').textContent = '+998' + (order.phone || '_________');
  document.getElementById('modalTotal').textContent = (order.total || 0).toLocaleString() + " so'm";
  
  const date = new Date(order.createdAt);
  document.getElementById('modalTime').textContent = date.toLocaleString('uz-UZ');
  
  const paymentMethod = order.paymentMethod || 'cash';
  const paymentStatus = order.paymentStatus || 'pending';
  document.getElementById('modalPayment').textContent = 
    `${paymentStatus === 'paid' ? '✅' : '⏳'} ${paymentMethod.toUpperCase()}`;
  
  const locationEl = document.getElementById('modalLocation');
  if (order.location && order.location.includes(',')) {
    const [lat, lng] = order.location.split(',');
    locationEl.href = `https://maps.google.com/?q=${lat.trim()},${lng.trim()}`;
    locationEl.style.display = 'inline';
  } else {
    locationEl.style.display = 'none';
  }
  
  const itemsHtml = order.items?.map(item => `
    <li>
      <span class="item-name">${item.name}</span>
      <span class="item-qty">x${item.qty}</span>
      <span class="item-price">${((item.price || 0) * item.qty).toLocaleString()} so'm</span>
    </li>
  `).join('') || "<li>Mahsulotlar yo'q</li>";
  document.getElementById('modalItems').innerHTML = itemsHtml;
  
  document.getElementById('modalActions').style.display = order.status === 'pending' ? 'flex' : 'none';
  document.getElementById('orderModal').classList.add('show');
};

window.acceptOrder = async function() {
  if (!currentOrderKey) return;
  
  try {
    await update(ref(db, `orders/${currentOrderKey}`), { 
      status: 'accepted',
      acceptedAt: new Date().toISOString()
    });
    showToast("✅ Buyurtma qabul qilindi!");
    closeModal();
  } catch (error) {
    showToast("❌ Xatolik");
  }
};

window.rejectOrder = async function() {
  if (!currentOrderKey || !confirm('Bekor qilishni tasdiqlaysizmi?')) return;
  
  try {
    await update(ref(db, `orders/${currentOrderKey}`), { 
      status: 'rejected',
      rejectedAt: new Date().toISOString()
    });
    showToast('❌ Bekor qilindi');
    closeModal();
  } catch (error) {
    showToast('❌ Xatolik');
  }
};

window.closeModal = function() {
  document.getElementById('orderModal').classList.remove('show');
  currentOrderKey = null;
};

// Utilities
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
  setTimeout(() => toast.remove(), 3000);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', init);

document.getElementById('orderModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'orderModal') closeModal();
});

document.getElementById('menuModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'menuModal') closeMenuModal();
});

document.getElementById('customerModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'customerModal') closeCustomerModal();
});