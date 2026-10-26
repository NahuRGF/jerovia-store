const express = require("express");
const crypto = require("crypto");
const multer = require("multer");
const path = require("path");
const { readProducts, writeProducts, readSeed } = require("../store");
const { requireAuth } = require("../auth");

const router = express.Router();

const CATEGORY_LABELS = {
  neumaticos: "Neumáticos",
  perfumes: "Perfumes árabes",
  electronica: "Electrónica",
  electrodomesticos: "Electrodomésticos",
  bazar: "Bazar",
};

const ALLOWED_CATEGORIES = Object.keys(CATEGORY_LABELS);
const UPLOAD_DIR = path.join(__dirname, "..", "..", "public", "uploads", "products");

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename(req, file, cb) {
    const ext = MIME_EXT[file.mimetype] || ".jpg";
    cb(null, crypto.randomBytes(12).toString("hex") + ext);
  },
});

const MIME_EXT = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter(req, file, cb) {
    if (MIME_EXT[file.mimetype]) return cb(null, true);
    cb(new Error("Formato de imagen no permitido (usá JPG, PNG o WebP)."));
  },
});

function isSafeImageRef(value) {
  if (typeof value !== "string" || value.length > 500) return false;
  if (value === "") return true;
  if (value.startsWith("/uploads/") || value.startsWith("/assets/")) return true;
  return /^https?:\/\//i.test(value);
}

function cleanString(value, max) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new Error("Valor inválido.");
  const v = value.trim();
  if (v.length > max) throw new Error("Texto demasiado largo.");
  return v;
}

function validateProduct(raw, { partial = false } = {}) {
  if (!raw || typeof raw !== "object") throw new Error("Producto inválido.");

  const errors = [];
  const out = {};

  if (raw.name !== undefined) {
    try {
      const v = cleanString(raw.name, 120);
      if (!v) errors.push("El nombre no puede estar vacío.");
      else out.name = v;
    } catch (e) {
      errors.push("Nombre inválido.");
    }
  } else if (!partial) {
    errors.push("Falta el nombre.");
  }

  if (raw.category !== undefined) {
    if (ALLOWED_CATEGORIES.includes(raw.category)) out.category = raw.category;
    else errors.push("Categoría inválida.");
  } else if (!partial) {
    errors.push("Falta la categoría.");
  }

  if (raw.brand !== undefined) {
    try {
      out.brand = cleanString(raw.brand, 60);
    } catch (e) {
      errors.push("Marca inválida.");
    }
  }

  if (raw.price !== undefined) {
    const price = Number(raw.price);
    if (Number.isFinite(price) && price >= 0 && price <= 1e12) out.price = price;
    else errors.push("Precio inválido.");
  } else if (!partial) {
    errors.push("Falta el precio.");
  }

  if (raw.stock !== undefined) {
    const stock = Number(raw.stock);
    if (Number.isInteger(stock) && stock >= 0 && stock <= 1e7) out.stock = stock;
    else errors.push("Stock inválido.");
  }

  if (raw.note !== undefined) {
    try {
      out.note = cleanString(raw.note, 200);
    } catch (e) {
      errors.push("Nota demasiado larga.");
    }
  }

  if (raw.emoji !== undefined) {
    try {
      out.emoji = cleanString(raw.emoji, 8);
    } catch (e) {
      errors.push("Emoji inválido.");
    }
  }

  if (raw.image !== undefined) {
    if (isSafeImageRef(raw.image)) out.image = raw.image;
    else errors.push("Imagen inválida.");
  }

  if (errors.length) {
    const err = new Error(errors.join(" "));
    err.status = 400;
    throw err;
  }
  return out;
}

function requireJSON(req, res, next) {
  const ct = req.get("Content-Type") || "";
  if (!ct.includes("application/json")) {
    return res.status(415).json({ error: "Se esperaba application/json." });
  }
  next();
}

router.get("/products", async (req, res, next) => {
  try {
    res.json(await readProducts());
  } catch (err) {
    next(err);
  }
});

router.post("/products", requireAuth, requireJSON, async (req, res, next) => {
  try {
    const value = validateProduct(req.body);
    const products = await readProducts();
    const product = { id: crypto.randomUUID(), ...value };
    products.push(product);
    await writeProducts(products);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

router.put("/products", requireAuth, requireJSON, async (req, res, next) => {
  try {
    if (!Array.isArray(req.body)) throw Object.assign(new Error("Se esperaba una lista de productos."), { status: 400 });
    const products = req.body.map((p) => {
      const value = validateProduct(p);
      if (!p.id || typeof p.id !== "string" || p.id.length > 40) {
        throw Object.assign(new Error("Producto sin id válido."), { status: 400 });
      }
      return { id: p.id, ...value };
    });
    await writeProducts(products);
    res.json(products);
  } catch (err) {
    next(err);
  }
});

router.put("/products/:id", requireAuth, requireJSON, async (req, res, next) => {
  try {
    const { id } = req.params;
    const value = validateProduct(req.body, { partial: true });
    const products = await readProducts();
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) return res.status(404).json({ error: "Producto no encontrado." });
    products[index] = { ...products[index], ...value };
    await writeProducts(products);
    res.json(products[index]);
  } catch (err) {
    next(err);
  }
});

router.delete("/products/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const products = await readProducts();
    const nextProducts = products.filter((p) => p.id !== id);
    if (nextProducts.length === products.length) {
      return res.status(404).json({ error: "Producto no encontrado." });
    }
    await writeProducts(nextProducts);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/products/reset", requireAuth, async (req, res, next) => {
  try {
    const seed = await readSeed();
    await writeProducts(seed);
    res.json(seed);
  } catch (err) {
    next(err);
  }
});

router.post("/upload", requireAuth, (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      const status = err instanceof multer.MulterError ? 400 : 400;
      return res.status(status).json({ error: err.message || "Error al subir la imagen." });
    }
    if (!req.file) return res.status(400).json({ error: "No se recibió ninguna imagen." });
    res.json({ url: "/uploads/products/" + req.file.filename });
  });
});

module.exports = router;
module.exports.CATEGORY_LABELS = CATEGORY_LABELS;
