const fs = require("fs");
const fsp = fs.promises;
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const SEED_FILE = path.join(DATA_DIR, "products.seed.json");

async function readProducts() {
  try {
    const raw = await fsp.readFile(PRODUCTS_FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

async function writeProducts(products) {
  const tmp = PRODUCTS_FILE + ".tmp";
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.writeFile(tmp, JSON.stringify(products, null, 2), "utf8");
  await fsp.rename(tmp, PRODUCTS_FILE);
}

async function readSeed() {
  const raw = await fsp.readFile(SEED_FILE, "utf8");
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : [];
}

module.exports = { readProducts, writeProducts, readSeed };
