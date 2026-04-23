import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, '..', 'data', 'headsets.json');

const raw = fs.readFileSync(dataPath, 'utf8');
const payload = JSON.parse(raw);

if (!payload || typeof payload !== 'object') {
  throw new Error('Dataset must be an object.');
}

if (!Array.isArray(payload.products)) {
  throw new Error('Dataset must include a products array.');
}

const requiredKeys = [
  'id',
  'brand',
  'productName',
  'releaseDate',
  'releaseYear',
  'releaseType',
  'priceStatus',
  'msrpUSD',
  'features',
  'sources'
];

const ids = new Set();

payload.products.forEach((product, index) => {
  requiredKeys.forEach(key => {
    if (!(key in product)) {
      throw new Error(`Product at index ${index} is missing required key: ${key}`);
    }
  });

  if (ids.has(product.id)) {
    throw new Error(`Duplicate product id detected: ${product.id}`);
  }
  ids.add(product.id);

  if (!Array.isArray(product.features)) {
    throw new Error(`Product ${product.id} must have features as an array.`);
  }

  if (!Array.isArray(product.sources)) {
    throw new Error(`Product ${product.id} must have sources as an array.`);
  }

  if (typeof product.releaseYear !== 'number') {
    throw new Error(`Product ${product.id} must have a numeric releaseYear.`);
  }

  if (typeof product.msrpUSD !== 'number') {
    throw new Error(`Product ${product.id} must have a numeric msrpUSD.`);
  }
});

console.log(`Validation passed: ${payload.products.length} products checked.`);
