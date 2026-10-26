const Store = (() => {
  const CATEGORY_LABELS = {
    neumaticos: "Neumáticos",
    perfumes: "Perfumes árabes",
    electronica: "Electrónica",
    electrodomesticos: "Electrodomésticos",
    bazar: "Bazar",
  };

  const WHATSAPP = "5493757334145";

  const CURRENCY_KEY = "jerovia_currency";
  const DEFAULT_CURRENCY = "USD";
  const DEFAULT_RATE = 1400;

  let products = [];
  let currency = localStorage.getItem(CURRENCY_KEY) || DEFAULT_CURRENCY;
  let rate = DEFAULT_RATE;
  let categoryImages = {};

  async function api(path, options = {}) {
    const res = await fetch(path, {
      credentials: "same-origin",
      headers: typeof options.body === "string" ? { "Content-Type": "application/json" } : undefined,
      ...options,
    });
    let data = null;
    try {
      data = await res.json();
    } catch (e) {}
    if (!res.ok) {
      const err = new Error((data && data.error) || "Error de conexión.");
      err.status = res.status;
      throw err;
    }
    return data;
  }

  function isSupabaseConfigured() {
    return !!(window.SUPABASE_URL && window.SUPABASE_ANON_KEY);
  }

  async function loadRemote() {
    const res = await fetch(
      window.SUPABASE_URL + "/rest/v1/products?select=*&order=created_at.asc",
      {
        headers: {
          apikey: window.SUPABASE_ANON_KEY,
          Authorization: "Bearer " + window.SUPABASE_ANON_KEY,
        },
      }
    );
    if (!res.ok) throw new Error("Error al cargar los productos.");
    return await res.json();
  }

  async function load() {
    if (isSupabaseConfigured()) {
      try {
        products = (await loadRemote()) || [];
      } catch (e) {
        products = [];
      }
    } else {
      try {
        products = (await api("/api/products")) || [];
      } catch (e) {
        products = (await api("data/products.json")) || [];
      }
    }
    await loadSettings();
  }

  async function loadSettings() {
    try {
      if (isSupabaseConfigured()) {
        const res = await fetch(
          window.SUPABASE_URL + "/rest/v1/settings?key=eq.store_config&select=value",
          {
            headers: {
              apikey: window.SUPABASE_ANON_KEY,
              Authorization: "Bearer " + window.SUPABASE_ANON_KEY,
            },
          }
        );
        if (res.ok) {
          const rows = await res.json();
          if (rows && rows.length) applySettings(rows[0].value);
        }
      } else {
        const cfg = await api("/api/settings");
        applySettings(cfg);
      }
    } catch (e) {}
  }

  function applySettings(cfg) {
    if (!cfg) return;
    const r = Number(cfg.rate);
    if (isFinite(r) && r > 0) rate = r;
    if (cfg.categoryImages && typeof cfg.categoryImages === "object") {
      Object.entries(cfg.categoryImages).forEach(([key, value]) => {
        if (typeof value === "string" && value) categoryImages[key] = value;
      });
    }
  }

  function getCategoryImages() {
    return categoryImages;
  }

  function getCategoryImage(cat) {
    return categoryImages[cat] || "";
  }

  function getProducts() {
    return products;
  }

  function setProducts(list) {
    products = Array.isArray(list) ? list : [];
  }

  function formatPrice(n) {
    const value = Number(n || 0);
    if (currency === "USD") {
      return "US$ " + value.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    const ars = Math.round(value * rate);
    return "$" + ars.toLocaleString("es-AR");
  }

  function getCurrency() {
    return currency;
  }

  function getRate() {
    return rate;
  }

  function setCurrency(value) {
    currency = value === "ARS" ? "ARS" : "USD";
    localStorage.setItem(CURRENCY_KEY, currency);
  }

  function waLink(message) {
    return "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(message);
  }

  return {
    CATEGORY_LABELS,
    WHATSAPP,
    api,
    load,
    getProducts,
    setProducts,
    formatPrice,
    getCurrency,
    getRate,
    setCurrency,
    getCategoryImages,
    getCategoryImage,
    waLink,
  };
})();
