const lock = document.getElementById("lock");
const lockForm = document.getElementById("lockForm");
const lockUser = document.getElementById("lockUser");
const lockPassword = document.getElementById("lockPassword");
const lockError = document.getElementById("lockError");
const lockBtn = document.getElementById("lockBtn");
const logoutBtn = document.getElementById("logoutBtn");

const form = document.getElementById("productForm");
const formTitle = document.getElementById("formTitle");
const listEl = document.getElementById("productList");
const searchInput = document.getElementById("searchInput");
const filterCategory = document.getElementById("filterCategory");
const statTotal = document.getElementById("statTotal");
const toastEl = document.getElementById("toast");
const imgModes = form.querySelectorAll('input[name="imgMode"]');
const imgEmoji = document.getElementById("imgEmoji");
const imgFile = document.getElementById("imgFile");
const imgUrl = document.getElementById("imgUrl");
const previewBox = document.getElementById("previewBox");

const fCategory = document.getElementById("fCategory");

let editingId = null;

/* ---------- Capa de datos: Supabase (web) o servidor local ---------- */

const SupabaseLayer = {
  configured() {
    return !!(window.SUPABASE_URL && window.SUPABASE_ANON_KEY && window.supabase);
  },
  _client: null,
  client() {
    if (!this._client) {
      this._client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    }
    return this._client;
  },
  async session() {
    const { data } = await this.client().auth.getSession();
    return !!data.session;
  },
  async login(email, password) {
    const { error } = await this.client().auth.signInWithPassword({ email, password });
    if (error) throw new Error("Email o contraseña incorrectos.");
  },
  async logout() {
    await this.client().auth.signOut();
  },
  async load() {
    const { data, error } = await this.client().from("products").select("*").order("created_at");
    if (error) throw new Error(error.message);
    Store.setProducts(data || []);
  },
  normalize(p) {
    return {
      name: String(p.name || ""),
      category: String(p.category || ""),
      brand: String(p.brand || ""),
      price: Number(p.price) || 0,
      emoji: String(p.emoji || "🛍️"),
      image: String(p.image || ""),
      note: String(p.note || ""),
      stock: Number.isInteger(p.stock) && p.stock >= 0 ? p.stock : 0,
    };
  },
  async create(payload) {
    const row = this.normalize(payload);
    row.id = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : String(Date.now());
    const { error } = await this.client().from("products").insert(row);
    if (error) throw new Error(error.message);
  },
  async update(id, payload) {
    const { error } = await this.client().from("products").update(this.normalize(payload)).eq("id", id);
    if (error) throw new Error(error.message);
  },
  async remove(id) {
    const { error } = await this.client().from("products").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
  async replaceAll(list) {
    const client = this.client();
    const { error: del } = await client.from("products").delete().neq("id", "");
    if (del) throw new Error(del.message);
    const rows = (list || []).map((p) => ({ id: p.id, ...this.normalize(p) }));
    if (rows.length) {
      const { error: ins } = await client.from("products").insert(rows);
      if (ins) throw new Error(ins.message);
    }
  },
  async reset() {
    const res = await fetch("data/products.json");
    const seed = await res.json();
    await this.replaceAll(seed);
  },
  async upload(file) {
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const name = Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
    const { error } = await this.client().storage.from("product-images").upload(name, file, { upsert: true });
    if (error) throw new Error("Error al subir la imagen: " + error.message);
    return this.client().storage.from("product-images").getPublicUrl(name).data.publicUrl;
  },
  async loadSettings() {
    const { data, error } = await this.client()
      .from("settings")
      .select("value")
      .eq("key", "store_config")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data && data.value ? data.value : { currency: "ARS", rate: 1400 };
  },
  async saveSettings(cfg) {
    const value = {
      currency: cfg.currency === "USD" ? "USD" : "ARS",
      rate: Number(cfg.rate) > 0 ? Number(cfg.rate) : 1400,
    };
    const { error } = await this.client()
      .from("settings")
      .upsert({ key: "store_config", value }, { onConflict: "key" });
    if (error) throw new Error(error.message);
  },
};

const API = {
  isRemote() {
    return SupabaseLayer.configured();
  },
  async login(username, password) {
    if (this.isRemote()) return SupabaseLayer.login(username, password);
    await Store.api("/api/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },
  async logout() {
    if (this.isRemote()) return SupabaseLayer.logout();
    try {
      await Store.api("/api/logout", { method: "POST" });
    } catch (e) {}
  },
  async session() {
    if (this.isRemote()) return SupabaseLayer.session();
    const s = await Store.api("/api/session");
    return !!s.authenticated;
  },
  async load() {
    if (this.isRemote()) return SupabaseLayer.load();
    await Store.load();
  },
  async create(payload) {
    if (this.isRemote()) return SupabaseLayer.create(payload);
    return Store.api("/api/products", { method: "POST", body: JSON.stringify(payload) });
  },
  async update(id, payload) {
    if (this.isRemote()) return SupabaseLayer.update(id, payload);
    return Store.api("/api/products/" + encodeURIComponent(id), {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  async remove(id) {
    if (this.isRemote()) return SupabaseLayer.remove(id);
    return Store.api("/api/products/" + encodeURIComponent(id), { method: "DELETE" });
  },
  async reset() {
    if (this.isRemote()) return SupabaseLayer.reset();
    return Store.api("/api/products/reset", { method: "POST" });
  },
  async replaceAll(list) {
    if (this.isRemote()) return SupabaseLayer.replaceAll(list);
    return Store.api("/api/products", { method: "PUT", body: JSON.stringify(list) });
  },
  async upload(file) {
    if (this.isRemote()) return SupabaseLayer.upload(file);
    const fd = new FormData();
    fd.append("image", file);
    const res = await Store.api("/api/upload", { method: "POST", body: fd });
    return res.url;
  },
  async loadSettings() {
    if (this.isRemote()) return SupabaseLayer.loadSettings();
    return Store.api("/api/settings");
  },
  async saveSettings(cfg) {
    if (this.isRemote()) return SupabaseLayer.saveSettings(cfg);
    return Store.api("/api/settings", { method: "PUT", body: JSON.stringify(cfg) });
  },
};

/* ---------- UI ---------- */

function initCategorySelects() {
  Object.entries(Store.CATEGORY_LABELS).forEach(([value, label]) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    fCategory.appendChild(opt);

    const opt2 = document.createElement("option");
    opt2.value = value;
    opt2.textContent = label;
    filterCategory.appendChild(opt2);
  });
}

function showToast(msg, isError) {
  toastEl.textContent = msg;
  toastEl.classList.add("is-visible");
  if (isError) toastEl.style.borderColor = "#e04b4b";
  else toastEl.style.borderColor = "rgba(201,162,39,.5)";
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toastEl.classList.remove("is-visible"), 3200);
}

function escapeHTML(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function itemThumb(p) {
  if (p.image) {
    return '<div class="admin__item-thumb"><img src="' + escapeHTML(p.image) + '" alt=""></div>';
  }
  return '<div class="admin__item-thumb">' + (p.emoji || "🛍️") + "</div>";
}

function renderList() {
  const q = searchInput.value.trim().toLowerCase();
  const cat = filterCategory.value;
  const products = Store.getProducts().filter((p) => {
    const okCat = cat === "todos" || p.category === cat;
    const okQ = !q || (p.name + " " + (p.brand || "")).toLowerCase().includes(q);
    return okCat && okQ;
  });

  statTotal.textContent = Store.getProducts().length;

  if (!products.length) {
    listEl.innerHTML = '<p class="admin__empty">No hay productos que coincidan.</p>';
    return;
  }

  const html = products
    .map(
      (p) =>
        '<div class="admin__item" data-id="' + escapeHTML(p.id) + '">' +
        itemThumb(p) +
        '<div class="admin__item-info">' +
        '<div class="admin__item-name">' + escapeHTML(p.name) + "</div>" +
        '<div class="admin__item-meta">' + escapeHTML(Store.CATEGORY_LABELS[p.category] || p.category) +
        (p.brand ? " · " + escapeHTML(p.brand) : "") +
        '<span class="admin__item-price"> · ' + Store.formatPrice(p.price) + "</span>" +
        (Number.isInteger(p.stock) ? '<span class="admin__item-stock"> · Stock: ' + p.stock + "</span>" : "") +
        "</div>" +
        "</div>" +
        '<div class="admin__item-btns">' +
        '<button class="admin__btn" data-action="edit">Editar</button>' +
        '<button class="admin__btn admin__btn--danger" data-action="delete">Borrar</button>' +
        "</div>" +
        "</div>"
    )
    .join("");

  listEl.innerHTML = html;
}

function showPanel() {
  lock.remove();
  logoutBtn.hidden = false;
  initSettings();
}

function showLock(message) {
  lockError.textContent = message || "Email o contraseña incorrectos.";
  lockError.hidden = false;
  lockBtn.disabled = false;
  lockPassword.value = "";
  lockPassword.focus();
}

async function initAuth() {
  try {
    if (await API.session()) {
      showPanel();
      await API.load();
      renderList();
    }
  } catch (err) {
    if (!API.isRemote()) showToast("Error de conexión con el servidor.", true);
  }
}

lockForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  lockBtn.disabled = true;
  lockError.hidden = true;
  try {
    await API.login(lockUser.value, lockPassword.value);
    showPanel();
    await API.load();
    renderList();
  } catch (err) {
    showLock(err.message);
  }
});

logoutBtn.addEventListener("click", async () => {
  await API.logout();
  window.location.href = "admin.html";
});

listEl.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const id = btn.closest(".admin__item").dataset.id;
  if (btn.dataset.action === "edit") {
    startEdit(id);
    return;
  }
  if (btn.dataset.action === "delete") {
    if (!confirm("¿Borrar este producto del catálogo?")) return;
    try {
      await API.remove(id);
      await API.load();
      if (editingId === id) resetForm();
      showToast("Producto borrado.");
      renderList();
    } catch (err) {
      showToast(err.message, true);
    }
  }
});

function currentImage() {
  return document.getElementById("fImageUrl").value.trim() || null;
}

async function submitHandler(e) {
  e.preventDefault();
  const payload = {
    name: document.getElementById("fName").value.trim(),
    category: fCategory.value,
    brand: document.getElementById("fBrand").value.trim(),
    price: Number(document.getElementById("fPrice").value),
    stock: Number(document.getElementById("fStock").value),
    note: document.getElementById("fNote").value.trim(),
    emoji: document.getElementById("fEmoji").value.trim() || "🛍️",
    image: currentImage(),
  };
  if (!payload.name || !payload.category || !(payload.price >= 0)) return;

  try {
    if (editingId) {
      await API.update(editingId, payload);
      showToast("Producto actualizado.");
    } else {
      await API.create(payload);
      showToast("Producto agregado al catálogo.");
    }
    await API.load();
    resetForm();
    renderList();
  } catch (err) {
    showToast(err.message, true);
  }
}

function startEdit(id) {
  const product = Store.getProducts().find((p) => p.id === id);
  if (!product) return;
  editingId = id;
  formTitle.textContent = "Editar producto";
  document.getElementById("fId").value = id;
  document.getElementById("fName").value = product.name;
  fCategory.value = product.category;
  document.getElementById("fBrand").value = product.brand || "";
  document.getElementById("fPrice").value = product.price;
  document.getElementById("fStock").value = Number.isInteger(product.stock) ? product.stock : 0;
  document.getElementById("fNote").value = product.note || "";
  document.getElementById("fEmoji").value = product.emoji || "";
  document.getElementById("fImageUrl").value = product.image || "";

  if (product.image) setImgMode("url");
  else setImgMode("emoji");
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetForm() {
  editingId = null;
  form.reset();
  document.getElementById("fEmoji").value = "🛍️";
  document.getElementById("fImageUrl").value = "";
  document.getElementById("fStock").value = "";
  fCategory.value = Object.keys(Store.CATEGORY_LABELS)[0];
  setImgMode("emoji");
  formTitle.textContent = "Nuevo producto";
}

function setImgMode(mode) {
  form.querySelectorAll('input[name="imgMode"]').forEach((r) => {
    r.checked = r.value === mode;
  });
  imgEmoji.classList.toggle("is-active", mode === "emoji");
  imgFile.classList.toggle("is-active", mode === "file");
  imgUrl.classList.toggle("is-active", mode === "url");
  updatePreview();
}

imgModes.forEach((radio) => {
  radio.addEventListener("change", () => setImgMode(radio.value));
});

function updatePreview() {
  const img = currentImage();
  if (img) {
    previewBox.innerHTML = '<img src="' + escapeHTML(img) + '" alt="">';
  } else {
    const emoji = document.getElementById("fEmoji").value.trim() || "🛍️";
    previewBox.textContent = emoji;
  }
}

document.getElementById("fEmoji").addEventListener("input", updatePreview);
document.getElementById("fImageUrl").addEventListener("input", updatePreview);

document.getElementById("fImageFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    showToast("Imagen muy grande (máx 2 MB).", true);
    e.target.value = "";
    return;
  }
  try {
    showToast("Subiendo imagen...");
    const url = await API.upload(file);
    document.getElementById("fImageUrl").value = url;
    setImgMode("url");
    showToast("Imagen subida correctamente.");
  } catch (err) {
    showToast(err.message, true);
  }
  e.target.value = "";
});

form.addEventListener("submit", submitHandler);
document.getElementById("cancelEdit").addEventListener("click", resetForm);
searchInput.addEventListener("input", renderList);
filterCategory.addEventListener("change", renderList);

document.getElementById("resetBtn").addEventListener("click", async () => {
  if (!confirm("¿Restaurar el catálogo de ejemplo? Se pierden todos los productos actuales.")) return;
  try {
    await API.reset();
    await API.load();
    resetForm();
    renderList();
    showToast("Catálogo restaurado.");
  } catch (err) {
    showToast(err.message, true);
  }
});

document.getElementById("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(Store.getProducts(), null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "products.json";
  a.click();
  URL.revokeObjectURL(a.href);
  showToast("Respaldo descargado.");
});

document.getElementById("importFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const arr = JSON.parse(await file.text());
    if (!Array.isArray(arr)) throw new Error("El archivo no contiene un listado de productos válido.");
    await API.replaceAll(arr);
    await API.load();
    resetForm();
    renderList();
    showToast("Respaldo importado correctamente.");
  } catch (err) {
    showToast(err.message, true);
  }
  e.target.value = "";
});

initCategorySelects();
resetForm();
initAuth();

/* ---------- Configuración (moneda y cotización) ---------- */

const cfgCurrency = document.getElementById("cfgCurrency");
const cfgRate = document.getElementById("cfgRate");

let cfgCurrencyValue = "ARS";

function cfgSetCurrency(value) {
  cfgCurrencyValue = value === "USD" ? "USD" : "ARS";
  cfgCurrency.querySelectorAll(".admin__seg-btn").forEach((b) => {
    b.classList.toggle("is-active", b.dataset.currency === cfgCurrencyValue);
  });
}

cfgCurrency.querySelectorAll(".admin__seg-btn").forEach((b) => {
  b.addEventListener("click", () => cfgSetCurrency(b.dataset.currency));
});

document.getElementById("cfgSave").addEventListener("click", async () => {
  try {
    await API.saveSettings({ currency: cfgCurrencyValue, rate: cfgRate.value });
    showToast("Configuración guardada.");
  } catch (err) {
    showToast(err.message, true);
  }
});

async function initSettings() {
  try {
    const cfg = await API.loadSettings();
    cfgSetCurrency(cfg.currency);
    cfgRate.value = cfg.rate;
  } catch (e) {}
}
