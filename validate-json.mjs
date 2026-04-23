import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, 'data', 'headsets.json');

const raw = fs.readFileSync(dataPath, 'utf8');
const payload = JSON.parse(raw);

if (!payload || typeof payload !== 'object') {
  throw new Error('Dataset must be a JSON object.');
}

if (!payload.metadata || typeof payload.metadata !== 'object') {
  throw new Error('Dataset must include a metadata object.');
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
  'sources',
  'images',
  'specs',
  'compare'
];

const ids = new Set();
const allowedNullableNumber = value => value === null || typeof value === 'number';
const allowedNullableString = value => value === null || typeof value === 'string';

payload.products.forEach((product, index) => {
  requiredKeys.forEach(key => {
    if (!(key in product)) {
      throw new Error(`Product at index ${index} is missing required key: ${key}`);
    }
  });

  if (!product.id || typeof product.id !== 'string') {
    throw new Error(`Product at index ${index} must include a string id.`);
  }

  if (ids.has(product.id)) {
    throw new Error(`Duplicate product id detected: ${product.id}`);
  }
  ids.add(product.id);

  if (typeof product.brand !== 'string' || typeof product.productName !== 'string') {
    throw new Error(`Product ${product.id} must include brand and productName as strings.`);
  }

  if (!allowedNullableString(product.releaseDate)) {
    throw new Error(`Product ${product.id} must have releaseDate as string or null.`);
  }

  if (!(product.releaseYear === null || Number.isInteger(product.releaseYear))) {
    throw new Error(`Product ${product.id} must have releaseYear as integer or null.`);
  }

  if (!allowedNullableNumber(product.msrpUSD)) {
    throw new Error(`Product ${product.id} must have msrpUSD as number or null.`);
  }

  if (!Array.isArray(product.features)) {
    throw new Error(`Product ${product.id} must have features as an array.`);
  }

  if (!Array.isArray(product.sources)) {
    throw new Error(`Product ${product.id} must have sources as an array.`);
  }

  if (!product.images?.primary?.src || typeof product.images.primary.src !== 'string') {
    throw new Error(`Product ${product.id} must include images.primary.src.`);
  }

  const localImagePath = path.join(__dirname, product.images.primary.src);
  if (!fs.existsSync(localImagePath)) {
    throw new Error(`Product ${product.id} image not found on disk: ${product.images.primary.src}`);
  }

  if (!product.specs || typeof product.specs !== 'object') {
    throw new Error(`Product ${product.id} must include a specs object.`);
  }

  if (!product.compare || typeof product.compare !== 'object') {
    throw new Error(`Product ${product.id} must include a compare object.`);
  }

  if (!Array.isArray(product.compare.platforms)) {
    throw new Error(`Product ${product.id} compare.platforms must be an array.`);
  }

  [
    'driverSizeMm',
    'batteryHours',
    'msrpUSD',
    'currentPriceUSD'
  ].forEach(key => {
    if (!allowedNullableNumber(product.compare[key])) {
      throw new Error(`Product ${product.id} compare.${key} must be number or null.`);
    }
  });
});

console.log(`Validation passed: ${payload.products.length} products checked.`);
