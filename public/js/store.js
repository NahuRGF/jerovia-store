const Store = (() => {
  const CATEGORY_LABELS = {
    neumaticos: "Neumáticos",
    perfumes: "Perfumes árabes",
    electronica: "Electrónica",
    electrodomesticos: "Electrodomésticos",
  };

  const WHATSAPP = "5493757334145";

  const CURRENCY_KEY = "jerovia_currency";
  const RATE_KEY = "jerovia_rate";

  let products = [];
  let currency = localStorage.getItem(CURRENCY_KEY) || "ARS";
  let rate = parseFloat(localStorage.getItem(RATE_KEY)) || 1400;

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
        return;
      } catch (e) {
        products = [];
      }
    }
    try {
      products = (await api("/api/products")) || [];
    } catch (e) {
      products = (await api("data/products.json")) || [];
    }
  }

  function getProducts() {
    return products;
  }

  function setProducts(list) {
    products = Array.isArray(list) ? list : [];
  }

  function formatPrice(n) {
    const value = Number(n || 0);
    if (currency === "USD" && rate > 0) {
      return "US$ " + (value / rate).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return "$" + value.toLocaleString("es-AR");
  }

  function getCurrency() {
    return currency;
  }

  function getRate() {
    return rate;
  }

  function setCurrency(value) {
    currency = value === "USD" ? "USD" : "ARS";
    localStorage.setItem(CURRENCY_KEY, currency);
  }

  function setRate(value) {
    const r = Number(value);
    if (!isFinite(r) || r <= 0) return;
    rate = r;
    localStorage.setItem(RATE_KEY, String(rate));
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
    setRate,
    waLink,
  };
})();
