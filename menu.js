// ==========================================
// BODRUM RESTAURANT - MENU DATA
// ==========================================

// Barcha taomlar shu yerda saqlanadi
export const menuData = [
  {
    id: 1,
    name: "Klyukva Burger",
    price: 44000,
    category: "burger",
    image: "https://i.ibb.co/sJtWCn5M/images-1.jpg",
    description: "Premium mol go'shtidan tayyorlangan burger",
    available: true,
    popular: true
  },
  {
    id: 2,
    name: "Klyukva Double Burger",
    price: 64000,
    category: "burger",
    image: "https://i.ibb.co/sJtWCn5M/images-1.jpg",
    description: "Ikki qavatli go'shtli burger",
    available: true,
    popular: true
  },
  {
    id: 3,
    name: "Klyukva Lavash",
    price: 39000,
    category: "lavash",
    image: "https://i.ibb.co/sJtWCn5M/images-1.jpg",
    description: "An'anaviy uzbek lavashi",
    available: true,
    popular: false
  },
  {
    id: 4,
    name: "Klyukva Lavash Maxi",
    price: 49000,
    category: "lavash",
    image: "https://i.ibb.co/sJtWCn5M/images-1.jpg",
    description: "Katta lavash ikki kishilik",
    available: true,
    popular: true
  },
  {
    id: 5,
    name: "Klyukva Burger Kombo",
    price: 64000,
    category: "combo",
    image: "https://i.ibb.co/sJtWCn5M/images-1.jpg",
    description: "Burger + Fries + Cola",
    available: true,
    popular: true
  },
  {
    id: 6,
    name: "Klyukva Lavash Kombo",
    price: 59000,
    category: "combo",
    image: "https://i.ibb.co/sJtWCn5M/images-1.jpg",
    description: "Lavash + Fries + Cola",
    available: true,
    popular: false
  },
  {
    id: 7,
    name: "Coca Cola",
    price: 12000,
    category: "drink",
    image: "https://i.ibb.co/sJtWCn5M/images-1.jpg",
    description: "0.5L sovuq cola",
    available: true,
    popular: false
  },
  {
    id: 8,
    name: "Fanta",
    price: 12000,
    category: "drink",
    image: "https://i.ibb.co/sJtWCn5M/images-1.jpg",
    description: "0.5L sovuq fanta",
    available: true,
    popular: false
  },
  {
    id: 9,
    name: "Trindwich",
    price: 52000,
    category: "burger",
    image: "https://i.ibb.co/sJtWCn5M/images-1.jpg",
    description: "Uch qavatli sendvich",
    available: true,
    popular: false
  },
  {
    id: 10,
    name: "Family Kombo",
    price: 189000,
    category: "combo",
    image: "https://i.ibb.co/sJtWCn5M/images-1.jpg",
    description: "4 kishilik oilaviy kombo",
    available: true,
    popular: true
  }
];

// Kategoriyalar
export const categories = [
  { id: "all", name: "Barchasi", icon: "🍽️" },
  { id: "burger", name: "Burger", icon: "🍔" },
  { id: "lavash", name: "Lavash", icon: "🌯" },
  { id: "combo", name: "Kombo", icon: "🍟" },
  { id: "drink", name: "Ichimlik", icon: "🥤" },
  { id: "salad", name: "Salat", icon: "🥗" },
  { id: "dessert", name: "Desert", icon: "🍰" }
];

// LocalStorage bilan ishlash uchun helperlar
export function saveMenuToLocal(menu) {
  localStorage.setItem('bodrum_menu', JSON.stringify(menu));
}

export function getMenuFromLocal() {
  const saved = localStorage.getItem('bodrum_menu');
  return saved ? JSON.parse(saved) : menuData;
}

export function saveCategoriesToLocal(cats) {
  localStorage.setItem('bodrum_categories', JSON.stringify(cats));
}

export function getCategoriesFromLocal() {
  const saved = localStorage.getItem('bodrum_categories');
  return saved ? JSON.parse(saved) : categories;
}

// Yangi taom qo'shish
export function addMenuItem(item) {
  const menu = getMenuFromLocal();
  const newId = Math.max(...menu.map(m => m.id), 0) + 1;
  const newItem = { ...item, id: newId, createdAt: new Date().toISOString() };
  menu.push(newItem);
  saveMenuToLocal(menu);
  return newItem;
}

// Taomni yangilash
export function updateMenuItem(id, updates) {
  const menu = getMenuFromLocal();
  const index = menu.findIndex(m => m.id === id);
  if (index !== -1) {
    menu[index] = { ...menu[index], ...updates, updatedAt: new Date().toISOString() };
    saveMenuToLocal(menu);
    return menu[index];
  }
  return null;
}

// Taomni o'chirish
export function deleteMenuItem(id) {
  const menu = getMenuFromLocal();
  const filtered = menu.filter(m => m.id !== id);
  saveMenuToLocal(filtered);
  return filtered;
}

// Yangi kategoriya qo'shish
export function addCategory(category) {
  const cats = getCategoriesFromLocal();
  cats.push(category);
  saveCategoriesToLocal(cats);
  return cats;
}
