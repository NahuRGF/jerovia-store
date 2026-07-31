const bcrypt = require("bcryptjs");

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_HASH = bcrypt.hashSync(process.env.ADMIN_PASSWORD || "", 10);

function checkCredentials(username, password) {
  if (typeof username !== "string" || typeof password !== "string") return false;
  if (username !== ADMIN_USER) return false;
  return bcrypt.compareSync(password, ADMIN_HASH);
}

function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  return res.status(401).json({ error: "No autorizado. Iniciá sesión." });
}

module.exports = { checkCredentials, requireAuth };
