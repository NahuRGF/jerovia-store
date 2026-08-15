if (location.hash === "#admin") {
  window.location.replace("admin.html");
}

window.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "A" || e.key === "a")) {
    e.preventDefault();
    window.location.href = "admin.html";
  }
});

const grid = document.getElementById("catalogGrid");
const filters = document.getElementById("filters");
const searchInput = document.getElementById("catalogSearch");
const sortSelect = document.getElementById("catalogSort");
const countEl = document.getElementById("catalogCount");

const state = {
  filter: "todos",
  search: "",
  sort: "destacados",
};

function productMedia(product) {
  const media = document.createElement("div");
  media.className = "product__media";
  if (product.image) {
    const img = document.createElement("img");
    img.src = product.image;
    img.alt = product.name;
    img.loading = "lazy";
    img.onerror = () => {
      img.remove();
      media.textContent = product.emoji || "🛍️";
    };
    media.appendChild(img);
  } else {
    const span = document.createElement("span");
    span.className = "product__emoji";
    span.textContent = product.emoji || "🛍️";
    media.appendChild(span);
  }
  if (product.stock !== undefined && product.stock !== null) {
    const badge = document.createElement("span");
    badge.className =
      product.stock > 0 ? "product__stock product__stock--ok" : "product__stock product__stock--sold";
    badge.textContent = product.stock > 0 ? "En stock" : "Sin stock";
    media.appendChild(badge);
  }
  return media;
}

function createProduct(product, index) {
  const article = document.createElement("article");
  article.className = "product reveal is-visible";
  article.style.setProperty("--d", (index * 0.07).toFixed(2) + "s");
  article.dataset.category = product.category;

  const body = document.createElement("div");
  body.className = "product__body";
  body.innerHTML =
    '<span class="product__cat">' + Store.CATEGORY_LABELS[product.category] + "</span>" +
    '<h3 class="product__name">' + product.name + "</h3>" +
    '<span class="product__brand">' + (product.brand || "") + "</span>" +
    '<p class="product__price">' + Store.formatPrice(product.price) + "</p>" +
    '<p class="product__note">' + (product.note || "Consultá disponibilidad y precio actual") + "</p>";

  const actions = document.createElement("div");
  actions.className = "product__actions";

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "btn btn--gold product__btn";
  addBtn.textContent = "Agregar al carrito";
  if (product.stock === 0) {
    addBtn.disabled = true;
    addBtn.textContent = "Sin stock";
  } else {
    addBtn.addEventListener("click", () => Cart.add(product.id));
  }

  const waBtn = document.createElement("a");
  waBtn.className = "product__wa";
  waBtn.setAttribute("aria-label", "Consultar por WhatsApp");
  waBtn.href = Store.waLink(
    "Hola Jerovia Store 👋 Quiero consultar por: " + product.name + " (" + Store.CATEGORY_LABELS[product.category] + ")."
  );
  waBtn.target = "_blank";
  waBtn.rel = "noopener";
  waBtn.innerHTML =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="M12.04 2a9.9 9.9 0 0 0-8.4 15.2L2 22l4.94-1.57A9.94 9.94 0 1 0 12.04 2Zm5.8 14.1c-.24.68-1.4 1.3-1.96 1.35-.52.05-1.18.08-1.9-.12a17 17 0 0 1-1.72-.64c-3.02-1.3-4.98-4.36-5.13-4.56-.15-.2-1.22-1.63-1.22-3.11 0-1.48.78-2.2 1.05-2.5.27-.3.6-.38.8-.38h.57c.18.01.43-.07.66.5l.9 2.19c.07.16.12.34.02.54l-.38.58-.44.52c-.14.14-.29.3-.13.58.17.28.75 1.24 1.61 2 .1.1.19.14.28.11l.65-.27c.2-.1.4-.1.56.03l1.97 1.4c.28.2.4.3.46.43.06.13.06.75-.18 1.5Z"/>' +
    "</svg>";

  actions.appendChild(addBtn);
  actions.appendChild(waBtn);
  body.appendChild(actions);
  article.appendChild(productMedia(product));
  article.appendChild(body);
  return article;
}

function renderSkeletons() {
  grid.innerHTML = "";
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < 8; i++) {
    const card = document.createElement("div");
    card.className = "skeleton-card";
    card.innerHTML =
      '<div class="skeleton skeleton-card__media"></div>' +
      '<div class="skeleton skeleton-card__line skeleton-card__line--short"></div>' +
      '<div class="skeleton skeleton-card__line"></div>' +
      '<div class="skeleton skeleton-card__line"></div>' +
      '<div class="skeleton skeleton-card__line skeleton-card__line--btn"></div>';
    fragment.appendChild(card);
  }
  grid.appendChild(fragment);
}

function getVisible() {
  let items = Store.getProducts().filter((p) => {
    const inCat = state.filter === "todos" || p.category === state.filter;
    const q = state.search.trim().toLowerCase();
    const inSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.brand || "").toLowerCase().includes(q) ||
      (Store.CATEGORY_LABELS[p.category] || "").toLowerCase().includes(q);
    return inCat && inSearch;
  });

  const copy = items.slice();
  if (state.sort === "precio-asc") copy.sort((a, b) => a.price - b.price);
  if (state.sort === "precio-desc") copy.sort((a, b) => b.price - a.price);
  if (state.sort === "az") copy.sort((a, b) => a.name.localeCompare(b.name, "es"));
  return copy;
}

function renderProducts() {
  const items = getVisible();
  grid.innerHTML = "";

  countEl.textContent =
    items.length === 1 ? "1 producto" : items.length + " productos";

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "catalog__count catalog__empty";
    empty.textContent = "No encontramos productos con esos filtros 😕";
    grid.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((p, i) => fragment.appendChild(createProduct(p, i)));
  grid.appendChild(fragment);
}

filters.addEventListener("click", (e) => {
  const btn = e.target.closest(".filter-btn");
  if (!btn) return;

  filters.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("is-active"));
  btn.classList.add("is-active");
  state.filter = btn.dataset.filter;
  renderProducts();
});

searchInput.addEventListener("input", () => {
  state.search = searchInput.value;
  renderProducts();
});

sortSelect.addEventListener("change", () => {
  state.sort = sortSelect.value;
  renderProducts();
});

document.querySelectorAll("[data-cat]").forEach((el) => {
  el.addEventListener("click", () => {
    const cat = el.dataset.cat;
    if (!cat) return;
    const target = filters.querySelector('[data-filter="' + cat + '"]');
    if (target) target.click();
  });
});

document.getElementById("searchBtn").addEventListener("click", () => {
  document.getElementById("catalogo").scrollIntoView({ behavior: "smooth" });
  setTimeout(() => searchInput.focus(), 500);
});

const header = document.getElementById("header");
const navToggle = document.getElementById("navToggle");
const nav = document.getElementById("nav");

window.addEventListener("scroll", () => {
  header.classList.toggle("is-scrolled", window.scrollY > 10);
});

navToggle.addEventListener("click", () => {
  const open = nav.classList.toggle("is-open");
  navToggle.classList.toggle("is-open", open);
  navToggle.setAttribute("aria-expanded", String(open));
});

nav.querySelectorAll("a").forEach((a) => {
  a.addEventListener("click", () => {
    nav.classList.remove("is-open");
    navToggle.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  });
});

const contactForm = document.getElementById("contactForm");
contactForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("cName").value.trim();
  const msg = document.getElementById("cMsg").value.trim();
  const text = "Hola Jerovia Store 👋 Soy " + (name || "un cliente") + ".\n\n" + (msg || "Quiero hacer una consulta.");
  window.open(Store.waLink(text), "_blank");
});

const offersForm = document.getElementById("offersForm");
offersForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("oName").value.trim();
  const text = "Hola Jerovia Store 👋 Me quiero suscribir para recibir ofertas exclusivas. Mi nombre es " + (name || "") + ".";
  window.open(Store.waLink(text), "_blank");
});

document.getElementById("year").textContent = new Date().getFullYear();

document.querySelectorAll("[data-wa]").forEach((el) => {
  el.href = Store.waLink("");
});

const toTop = document.getElementById("toTop");

window.addEventListener(
  "scroll",
  () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
    toTop.style.setProperty("--p", (p * 100).toFixed(1));
    toTop.classList.toggle("is-visible", window.scrollY > 500);
  },
  { passive: true }
);

toTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

const counters = document.querySelectorAll("[data-count]");
const countObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.count, 10);
      const duration = 1200;
      const start = performance.now();

      function tick(now) {
        const t = Math.min((now - start) / duration, 1);
        el.textContent = Math.floor(t * target).toLocaleString("es-AR");
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      countObserver.unobserve(el);
    });
  },
  { threshold: 0.6 }
);
counters.forEach((c) => countObserver.observe(c));

const staggerContainers = [
  ".benefits__grid",
  ".categories__grid",
  ".contact__grid",
  ".about__stats",
];

staggerContainers.forEach((sel) => {
  document.querySelectorAll(sel + " .reveal").forEach((el, i) => {
    el.style.setProperty("--d", (i * 0.12).toFixed(2) + "s");
  });
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);
document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

function applyCategoryImages() {
  const imgs = document.querySelectorAll(".cat-card__media img");
  imgs.forEach((img) => {
    const card = img.closest("[data-cat]");
    if (!card) return;
    const custom = Store.getCategoryImage(card.dataset.cat);
    if (custom) img.src = custom;
  });
}

renderSkeletons();
Store.load()
  .then(() => {
    applyCategoryImages();
    renderProducts();
    Cart.render();
  })
  .catch(() => {
    countEl.textContent = "No pudimos cargar el catálogo 😕";
    grid.innerHTML = "";
  });

/* ---------- Carrito ---------- */

const CART_KEY = "jerovia_cart";
const cartEl = document.getElementById("cart");
const cartBtn = document.getElementById("cartBtn");
const cartClose = document.getElementById("cartClose");
const cartOverlay = document.getElementById("cartOverlay");
const cartBody = document.getElementById("cartBody");
const cartBadge = document.getElementById("cartBadge");
const cartTotal = document.getElementById("cartTotal");
const cartCheckout = document.getElementById("cartCheckout");
const cartClear = document.getElementById("cartClear");
const toast = document.getElementById("toast");

let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

const Cart = {
  items: JSON.parse(localStorage.getItem(CART_KEY) || "[]"),

  save() {
    localStorage.setItem(CART_KEY, JSON.stringify(this.items));
  },

  product(productId) {
    return Store.getProducts().find((p) => p.id === productId);
  },

  add(productId) {
    const item = this.items.find((i) => i.id === productId);
    if (item) item.qty += 1;
    else this.items.push({ id: productId, qty: 1 });
    this.save();
    this.render();
    cartBadge.classList.remove("bump");
    void cartBadge.offsetWidth;
    cartBadge.classList.add("bump");
    showToast("Agregado al carrito ✓");
  },

  setQty(productId, qty) {
    const item = this.items.find((i) => i.id === productId);
    if (!item) return;
    if (qty <= 0) this.remove(productId);
    else {
      item.qty = qty;
      this.save();
      this.render();
    }
  },

  remove(productId) {
    this.items = this.items.filter((i) => i.id !== productId);
    this.save();
    this.render();
  },

  clear() {
    this.items = [];
    this.save();
    this.render();
  },

  count() {
    return this.items.reduce((n, i) => n + i.qty, 0);
  },

  total() {
    return this.items.reduce((sum, i) => sum + (this.product(i.id)?.price || 0) * i.qty, 0);
  },

  render() {
    const count = this.count();
    cartBadge.hidden = count === 0;
    cartBadge.textContent = count;
    cartBadge.classList.toggle("is-visible", count > 0);

    const rows = this.items
      .map((i) => ({ qty: i.qty, product: this.product(i.id) }))
      .filter((r) => r.product);

    cartBody.innerHTML = "";
    if (!rows.length) {
      const empty = document.createElement("div");
      empty.className = "cart__empty";
      empty.innerHTML =
        '<span class="cart__empty-icon">🛒</span>Tu carrito está vacío.<br>Agregá tus productos y completá la venta por WhatsApp.';
      cartBody.appendChild(empty);
      cartTotal.textContent = Store.formatPrice(0);
      cartCheckout.disabled = true;
      return;
    }

    const qtyOf = {};
    this.items.forEach((i) => (qtyOf[i.id] = i.qty));

    const fragment = document.createDocumentFragment();
    rows.forEach(({ qty, product }) => {
      const row = document.createElement("div");
      row.className = "cart__item";

      const media = document.createElement("div");
      media.className = "cart__item-media";
      if (product.image) {
        const img = document.createElement("img");
        img.src = product.image;
        img.alt = product.name;
        img.onerror = () => {
          media.textContent = product.emoji || "🛍️";
        };
        media.appendChild(img);
      } else {
        media.textContent = product.emoji || "🛍️";
      }

      const info = document.createElement("div");
      info.className = "cart__item-info";
      info.innerHTML =
        '<div class="cart__item-name">' + product.name + "</div>" +
        '<div class="cart__item-price">' + Store.formatPrice(product.price) + " c/u</div>";

      const actions = document.createElement("div");
      actions.className = "cart__item-actions";

      const minus = document.createElement("button");
      minus.type = "button";
      minus.className = "qty-btn";
      minus.textContent = "−";
      minus.setAttribute("aria-label", "Quitar uno");
      minus.addEventListener("click", () => this.setQty(product.id, qty - 1));

      const qtyEl = document.createElement("span");
      qtyEl.className = "cart__item-qty";
      qtyEl.textContent = qty;

      const plus = document.createElement("button");
      plus.type = "button";
      plus.className = "qty-btn";
      plus.textContent = "+";
      plus.setAttribute("aria-label", "Agregar uno");
      plus.addEventListener("click", () => this.setQty(product.id, qty + 1));

      actions.append(minus, qtyEl, plus);

      const del = document.createElement("button");
      del.type = "button";
      del.className = "qty-btn qty-btn--del";
      del.textContent = "✕";
      del.setAttribute("aria-label", "Quitar del carrito");
      del.addEventListener("click", () => this.remove(product.id));

      const sub = document.createElement("div");
      sub.className = "cart__item-subtotal";
      sub.textContent = Store.formatPrice(product.price * qty);

      row.append(media, info, actions, del, sub);
      fragment.appendChild(row);
    });

    cartBody.appendChild(fragment);
    cartTotal.textContent = Store.formatPrice(this.total());
    cartCheckout.disabled = false;
  },

  buildMessage() {
    const qtyOf = {};
    this.items.forEach((i) => (qtyOf[i.id] = i.qty));
    const lines = this.items
      .map((i) => this.product(i.id))
      .filter(Boolean)
      .map((p, idx) => {
        const q = qtyOf[p.id];
        return (idx + 1) + ") " + p.name + " — x" + q + " (" + Store.formatPrice(p.price) + " c/u) = " + Store.formatPrice(p.price * q);
      });
    return (
      "Hola Jerovia Store 👋 Quiero completar mi compra:\n\n" +
      lines.join("\n") +
      "\n\nTOTAL: " + Store.formatPrice(this.total())
    );
  },
};

function openCart() {
  cartEl.classList.add("is-open");
  cartEl.setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");
}

function closeCart() {
  cartEl.classList.remove("is-open");
  cartEl.setAttribute("aria-hidden", "true");
  document.body.classList.remove("no-scroll");
}

cartBtn.addEventListener("click", () => {
  Cart.render();
  openCart();
});

cartClose.addEventListener("click", closeCart);
cartOverlay.addEventListener("click", closeCart);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeCart();
});

cartCheckout.addEventListener("click", () => {
  const message = Cart.buildMessage();
  if (!message) return;
  window.open(Store.waLink(message), "_blank");
  closeCart();
});

cartClear.addEventListener("click", () => {
  Cart.clear();
  showToast("Carrito vaciado");
});

/* ---------- Moneda visible (la elige el comprador) ---------- */

const currencyEl = document.getElementById("currency");
const currencyOpts = currencyEl.querySelectorAll(".currency__opt");

function applyCurrencyUI() {
  const cur = Store.getCurrency();
  currencyOpts.forEach((b) => {
    const active = b.dataset.currency === cur;
    b.classList.toggle("is-active", active);
    b.setAttribute("aria-pressed", String(active));
  });
}

currencyOpts.forEach((b) => {
  b.addEventListener("click", () => {
    Store.setCurrency(b.dataset.currency);
    applyCurrencyUI();
    renderProducts();
    Cart.render();
  });
});

applyCurrencyUI();
