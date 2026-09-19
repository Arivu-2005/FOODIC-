/* Foodic - standalone version. Pure HTML + CSS + JavaScript, no server needed.
   Data (accounts, cart, orders) is saved in the browser with localStorage.
   Demo only: passwords are stored in the browser, so do not use real passwords. */

const $ = (sel) => document.querySelector(sel);
const money = (n) => "₹" + n.toLocaleString("en-IN");
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- menu data ---------- */
const FOODS = [
  { id: 1, name: "Masala dosa", description: "Crisp rice crepe, spiced potato, coconut chutney and sambar.", price: 90, category: "Breakfast", emoji: "🥞", veg: true },
  { id: 2, name: "Idli sambar", description: "Four steamed idlis with sambar and two chutneys.", price: 60, category: "Breakfast", emoji: "🍚", veg: true },
  { id: 3, name: "Pongal", description: "Ghee-rich rice and moong dal, black pepper, cashew.", price: 70, category: "Breakfast", emoji: "🥣", veg: true },
  { id: 4, name: "Chicken biryani", description: "Seeraga samba rice, slow-cooked chicken, raita.", price: 220, category: "Rice", emoji: "🍛", veg: false },
  { id: 5, name: "Veg biryani", description: "Fragrant rice with seasonal vegetables and mint.", price: 170, category: "Rice", emoji: "🍲", veg: true },
  { id: 6, name: "Curd rice", description: "Cooling curd rice, mustard tempering, pomegranate.", price: 80, category: "Rice", emoji: "🍚", veg: true },
  { id: 7, name: "Medu vada", description: "Crunchy lentil doughnuts, served hot with chutney.", price: 50, category: "Snacks", emoji: "🍩", veg: true },
  { id: 8, name: "Chicken 65", description: "Spicy fried chicken with curry leaf and green chilli.", price: 180, category: "Snacks", emoji: "🍗", veg: false },
  { id: 9, name: "Paneer tikka", description: "Charred paneer, capsicum and onion, mint dip.", price: 190, category: "Snacks", emoji: "🍢", veg: true },
  { id: 10, name: "Filter coffee", description: "Strong decoction, hot milk, served in a davara.", price: 40, category: "Drinks", emoji: "☕", veg: true },
  { id: 11, name: "Fresh lime soda", description: "Sweet, salt or mixed. Ice cold.", price: 45, category: "Drinks", emoji: "🍋", veg: true },
  { id: 12, name: "Rose milk", description: "Chilled milk with rose syrup and basil seeds.", price: 55, category: "Drinks", emoji: "🥛", veg: true },
  { id: 13, name: "Gulab jamun", description: "Two warm jamuns in cardamom syrup.", price: 60, category: "Sweets", emoji: "🍮", veg: true },
  { id: 14, name: "Kesari", description: "Semolina, saffron, ghee and roasted cashew.", price: 50, category: "Sweets", emoji: "🍡", veg: true },
];

/* ---------- saved data helpers ---------- */
const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
};

const state = {
  cart: store.get("foodic_cart", {}), // { foodId: qty }
  user: null,
  category: "All",
  query: "",
  authMode: "login",
};

function loadUser() {
  const id = store.get("foodic_session", null);
  state.user = store.get("foodic_users", []).find((u) => u.id === id) || null;
}

/* ---------- toast ---------- */
let toastTimer;
function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
}

/* ---------- cart state ---------- */
function setQty(id, qty) {
  if (qty <= 0) delete state.cart[id];
  else state.cart[id] = Math.min(qty, 20);
  store.set("foodic_cart", state.cart);
  renderMenu();
  renderCart();
}

function cartLines() {
  return Object.entries(state.cart)
    .map(([id, qty]) => ({ food: FOODS.find((f) => f.id === Number(id)), qty }))
    .filter((l) => l.food);
}

/* ---------- menu ---------- */
function renderChips() {
  const cats = ["All", ...new Set(FOODS.map((f) => f.category))];
  $("#chips").innerHTML = cats
    .map((c) => `<button class="chip" data-cat="${esc(c)}" aria-pressed="${c === state.category}">${esc(c)}</button>`)
    .join("");
}

function renderMenu() {
  const q = state.query.trim().toLowerCase();
  const list = FOODS.filter(
    (f) =>
      (state.category === "All" || f.category === state.category) &&
      (!q || f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q))
  );

  if (!list.length) {
    $("#menu").innerHTML = `<p class="empty">Nothing matches "${esc(state.query)}". Try another dish or clear the search.</p>`;
    return;
  }

  $("#menu").innerHTML = list
    .map((f) => {
      const qty = state.cart[f.id] || 0;
      const action = qty
        ? `<div class="stepper">
             <button data-dec="${f.id}" aria-label="Remove one ${esc(f.name)}">&minus;</button>
             <span>${qty}</span>
             <button data-inc="${f.id}" aria-label="Add one ${esc(f.name)}">+</button>
           </div>`
        : `<button class="add-btn" data-add="${f.id}">Add</button>`;
      return `
        <article class="dish" data-cat="${esc(f.category)}">
          <div class="dish-art">
            <span class="veg-mark ${f.veg ? "" : "non"}" title="${f.veg ? "Vegetarian" : "Non-vegetarian"}"></span>
            <span aria-hidden="true">${f.emoji}</span>
          </div>
          <div class="dish-body">
            <h3>${esc(f.name)}</h3>
            <p>${esc(f.description)}</p>
            <div class="dish-foot"><span class="price">${money(f.price)}</span>${action}</div>
          </div>
        </article>`;
    })
    .join("");
}

/* ---------- cart drawer ---------- */
function renderCart() {
  const lines = cartLines();
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const total = lines.reduce((n, l) => n + l.qty * l.food.price, 0);

  const badge = $("#cartCount");
  if (badge.textContent !== String(count)) {
    badge.textContent = count;
    badge.classList.remove("bump");
    void badge.offsetWidth;
    badge.classList.add("bump");
  }
  $("#cartTotal").textContent = money(total);

  $("#cartItems").innerHTML = lines.length
    ? lines
        .map(
          ({ food, qty }) => `
        <div class="cart-line">
          <div class="em" aria-hidden="true">${food.emoji}</div>
          <div><div class="nm">${esc(food.name)}</div><div class="sub">${money(food.price)} each</div></div>
          <div class="stepper">
            <button data-dec="${food.id}" aria-label="Remove one ${esc(food.name)}">&minus;</button>
            <span>${qty}</span>
            <button data-inc="${food.id}" aria-label="Add one ${esc(food.name)}">+</button>
          </div>
        </div>`
        )
        .join("")
    : `<p class="empty">Your cart is empty. Add a dish from the menu to start.</p>`;
}

function openCart() {
  $("#drawer").classList.add("open");
  $("#drawer").setAttribute("aria-hidden", "false");
  $("#scrim").hidden = false;
}
function closeCart() {
  $("#drawer").classList.remove("open");
  $("#drawer").setAttribute("aria-hidden", "true");
  $("#scrim").hidden = true;
}

/* ---------- auth (saved in the browser) ---------- */
function renderUser() {
  const u = state.user;
  $("#authBtn").textContent = u ? `Log out (${u.name.split(" ")[0]})` : "Log in";
  $("#ordersBtn").hidden = !u;
}

function setAuthMode(mode) {
  state.authMode = mode;
  const signup = mode === "register";
  $("#authTitle").textContent = signup ? "Create your account" : "Log in";
  $("#authSubmit").textContent = signup ? "Create account" : "Log in";
  $("#authSwitch").textContent = signup ? "Have an account? Log in" : "New here? Create an account";
  $("#nameField").hidden = !signup;
  $("#authName").required = signup;
  $("#authPassword").autocomplete = signup ? "new-password" : "current-password";
  $("#authError").textContent = "";
}

function openAuth(mode = "login") {
  setAuthMode(mode);
  $("#authForm").reset();
  $("#authDialog").showModal();
  (mode === "register" ? $("#authName") : $("#authEmail")).focus();
}

function submitAuth(e) {
  e.preventDefault();
  const signup = state.authMode === "register";
  const name = $("#authName").value.trim();
  const email = $("#authEmail").value.trim().toLowerCase();
  const password = $("#authPassword").value;
  const users = store.get("foodic_users", []);
  const error = $("#authError");

  if (signup) {
    if (!name || !email.includes("@") || password.length < 6) {
      return (error.textContent = "Enter your name, a valid email and a password of 6+ characters.");
    }
    if (users.some((u) => u.email === email)) {
      return (error.textContent = "That email already has an account. Log in instead.");
    }
    const user = { id: Date.now(), name, email, password };
    users.push(user);
    store.set("foodic_users", users);
    store.set("foodic_session", user.id);
    state.user = user;
  } else {
    const user = users.find((u) => u.email === email && u.password === password);
    if (!user) return (error.textContent = "Email or password is wrong.");
    store.set("foodic_session", user.id);
    state.user = user;
  }

  renderUser();
  $("#authDialog").close();
  toast(signup ? "Account created. Welcome to Foodic." : `Welcome back, ${state.user.name.split(" ")[0]}.`);
}

function logout() {
  localStorage.removeItem("foodic_session");
  state.user = null;
  renderUser();
  toast("You are logged out.");
}

/* ---------- checkout and orders ---------- */
function placeOrder(e) {
  e.preventDefault();
  const err = $("#checkoutError");
  err.textContent = "";
  const lines = cartLines();
  const address = $("#address").value.trim();

  if (!lines.length) return (err.textContent = "Your cart is empty. Add a dish first.");
  if (!state.user) {
    closeCart();
    toast("Log in to place your order.");
    return openAuth("login");
  }
  if (address.length < 8) return (err.textContent = "Enter a full delivery address.");

  const orders = store.get("foodic_orders", []);
  const order = {
    id: orders.length + 1001,
    userId: state.user.id,
    address,
    createdAt: Date.now(),
    total: lines.reduce((n, l) => n + l.qty * l.food.price, 0),
    items: lines.map((l) => ({ name: l.food.name, price: l.food.price, qty: l.qty })),
  };
  orders.push(order);
  store.set("foodic_orders", orders);

  state.cart = {};
  store.set("foodic_cart", state.cart);
  $("#address").value = "";
  renderMenu();
  renderCart();
  closeCart();
  toast(`Order #${order.id} placed. Total ${money(order.total)}.`);
}

const STATUS_LABEL = {
  placed: "Order placed",
  preparing: "Being prepared",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
};

/* Demo: the status moves forward automatically as time passes. */
function statusOf(order) {
  const secs = (Date.now() - order.createdAt) / 1000;
  if (secs < 30) return "placed";
  if (secs < 90) return "preparing";
  if (secs < 180) return "out_for_delivery";
  return "delivered";
}

let ordersTimer;
function renderOrders() {
  const box = $("#ordersList");
  const mine = store.get("foodic_orders", []).filter((o) => o.userId === state.user?.id).reverse();
  box.innerHTML = mine.length
    ? mine
        .map((o) => {
          const status = statusOf(o);
          return `
          <div class="order-card">
            <div class="order-top"><strong>Order #${o.id}</strong><span>${money(o.total)}</span></div>
            <div class="order-items">${o.items.map((i) => `${i.qty} × ${esc(i.name)}`).join(", ")}</div>
            <span class="status ${status}">${STATUS_LABEL[status]}</span>
          </div>`;
        })
        .join("")
    : `<p class="empty">No orders yet. Your first one will show up here.</p>`;
}

function openOrders() {
  renderOrders();
  $("#ordersDialog").showModal();
  clearInterval(ordersTimer);
  ordersTimer = setInterval(renderOrders, 5000); // refresh status while open
}

/* ---------- events ---------- */
document.addEventListener("click", (e) => {
  const t = e.target.closest("button");
  if (!t) return;
  if (t.dataset.add) { setQty(+t.dataset.add, 1); toast("Added to cart"); }
  else if (t.dataset.inc) setQty(+t.dataset.inc, (state.cart[t.dataset.inc] || 0) + 1);
  else if (t.dataset.dec) setQty(+t.dataset.dec, (state.cart[t.dataset.dec] || 0) - 1);
  else if (t.classList.contains("chip")) {
    state.category = t.dataset.cat;
    renderChips();
    renderMenu();
  }
});

$("#searchInput").addEventListener("input", (e) => { state.query = e.target.value; renderMenu(); });
$("#cartBtn").addEventListener("click", openCart);
$("#closeCart").addEventListener("click", closeCart);
$("#scrim").addEventListener("click", closeCart);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeCart(); });

$("#authBtn").addEventListener("click", () => (state.user ? logout() : openAuth("login")));
$("#authSwitch").addEventListener("click", () => setAuthMode(state.authMode === "login" ? "register" : "login"));
$("#authCancel").addEventListener("click", () => $("#authDialog").close());
$("#authForm").addEventListener("submit", submitAuth);
$("#checkoutForm").addEventListener("submit", placeOrder);
$("#ordersBtn").addEventListener("click", openOrders);
$("#closeOrders").addEventListener("click", () => $("#ordersDialog").close());
$("#ordersDialog").addEventListener("close", () => clearInterval(ordersTimer));

/* ---------- start ---------- */
loadUser();
renderChips();
renderMenu();
renderCart();
renderUser();
