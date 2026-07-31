const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "data");
const publicDir = path.join(__dirname, "public", "data");

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const products = JSON.parse(fs.readFileSync(path.join(dataDir, "products.json"), "utf8"));
fs.writeFileSync(
  path.join(publicDir, "products.json"),
  JSON.stringify(products, null, 2),
  "utf8"
);

console.log("✔ public/data/products.json generado con " + products.length + " productos.");
