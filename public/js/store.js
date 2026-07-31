const Store = (() => {
  const CATEGORY_LABELS = {
    neumaticos: "Neumáticos",
    perfumes: "Perfumes árabes",
    electronica: "Electrónica",
    electrodomesticos: "Electrodomésticos",
  };

  const WHATSAPP = "5493757334145";

  let products = [];

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
    return "$" + Number(n || 0).toLocaleString("es-AR");
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
    waLink,
  };
})();
