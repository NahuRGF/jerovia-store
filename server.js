require("dotenv").config();

const path = require("path");
const fs = require("fs");
const express = require("express");
const session = require("express-session");
const FileStore = require("session-file-store")(session);
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { checkCredentials, requireAuth } = require("./src/auth");
const productsRouter = require("./src/routes/products");

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === "production";

const PUBLIC_DIR = path.join(__dirname, "public");
const SESSIONS_DIR = path.join(__dirname, "data", "sessions");
const UPLOAD_DIR = path.join(__dirname, "public", "uploads", "products");

fs.mkdirSync(SESSIONS_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET || SESSION_SECRET.includes("change-me")) {
  console.warn("[warn] SESSION_SECRET no configurado correctamente. Usalo desde .env en producción.");
}
if (!process.env.ADMIN_PASSWORD) {
  console.error("[error] Falta ADMIN_PASSWORD en .env. El panel no puede funcionar.");
  process.exit(1);
}

const app = express();
if (IS_PROD) app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: (() => {
        const d = {
          "default-src": ["'self'"],
          "base-uri": ["'self'"],
          "object-src": ["'none'"],
          "script-src": ["'self'"],
          "img-src": ["'self'", "data:", "https:"],
          "style-src": ["'self'", "https://fonts.googleapis.com"],
          "font-src": ["'self'", "https://fonts.gstatic.com"],
          "connect-src": ["'self'"],
          "form-action": ["'self'"],
          "frame-ancestors": ["'none'"],
        };
        if (IS_PROD) d["upgrade-insecure-requests"] = [];
        return d;
      })(),
    },
    crossOriginResourcePolicy: { policy: "same-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })
);

app.use(
  session({
    store: new FileStore({ path: SESSIONS_DIR, ttl: 60 * 60 * 24 * 7 }),
    name: "jsid",
    secret: SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: "strict",
      secure: IS_PROD,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

app.use(express.json({ limit: "64kb" }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({ error: "Demasiadas solicitudes. Probá en unos minutos." }),
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({ error: "Demasiados intentos de acceso. Esperá unos minutos." }),
});

app.use("/api", apiLimiter);

app.post("/api/login", loginLimiter, (req, res) => {
  const { username, password } = req.body || {};
  if (!checkCredentials(username, password)) {
    return res.status(401).json({ error: "Usuario o contraseña incorrectos." });
  }
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: "Error interno del servidor." });
    req.session.authenticated = true;
    res.json({ ok: true });
  });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("jsid");
    res.json({ ok: true });
  });
});

app.get("/api/session", (req, res) => {
  res.json({ authenticated: !!(req.session && req.session.authenticated) });
});

app.use("/api", productsRouter);

const SETTINGS_FILE = path.join(__dirname, "data", "settings.json");
const DEFAULT_SETTINGS = { currency: "ARS", rate: 1400 };

function readSettings() {
  try {
    const cfg = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
    return {
      currency: cfg.currency === "USD" ? "USD" : "ARS",
      rate: Number(cfg.rate) > 0 ? Number(cfg.rate) : DEFAULT_SETTINGS.rate,
    };
  } catch (e) {
    return { ...DEFAULT_SETTINGS };
  }
}

app.get("/api/settings", (req, res) => {
  res.json(readSettings());
});

app.put("/api/settings", requireAuth, (req, res) => {
  const body = req.body || {};
  const currency = body.currency === "USD" ? "USD" : "ARS";
  const rate = Number(body.rate);
  if (!isFinite(rate) || rate <= 0) {
    return res.status(400).json({ error: "Cotización inválida." });
  }
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ currency, rate }, null, 2));
  res.json({ ok: true, currency, rate });
});

app.use(express.static(PUBLIC_DIR, { index: "index.html", maxAge: IS_PROD ? "1h" : 0 }));

app.use("/api", (req, res) => {
  res.status(404).json({ error: "Recurso no encontrado." });
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? "Error interno del servidor." : err.message });
});

app.listen(PORT, () => {
  console.log(`Jerovia Store corriendo en http://localhost:${PORT}`);
});
