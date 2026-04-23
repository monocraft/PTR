import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, 'data', 'headsets.json');

const raw = fs.readFileSync(dataPath, 'utf8');
const payload = JSON.parse(raw);

if (!payload || typeof payload !== 'object') throw new Error('Dataset must be a JSON object.');
if (!payload.metadata || typeof payload.metadata !== 'object') throw new Error('Dataset must include a metadata object.');
if (!Array.isArray(payload.products)) throw new Error('Dataset must include a products array.');

const ids = new Set();
const isNullableNumber = value => value === null || typeof value === 'number';
const isNullableString = value => value === null || typeof value === 'string';

for (const [index, product] of payload.products.entries()) {
  for (const key of ['id','brand','productName','releaseDate','releaseYear','releaseType','priceStatus','msrpUSD','features','sources','images','specs','compare','imageBackfill']) {
    if (!(key in product)) throw new Error(`Product at index ${index} is missing required key: ${key}`);
  }

  if (typeof product.id !== 'string' || !product.id) throw new Error(`Invalid id at index ${index}.`);
  if (ids.has(product.id)) throw new Error(`Duplicate product id detected: ${product.id}`);
  ids.add(product.id);

  if (!isNullableString(product.releaseDate)) throw new Error(`Product ${product.id} releaseDate must be string or null.`);
  if (!(product.releaseYear === null || Number.isInteger(product.releaseYear))) throw new Error(`Product ${product.id} releaseYear must be integer or null.`);
  if (!isNullableNumber(product.msrpUSD)) throw new Error(`Product ${product.id} msrpUSD must be number or null.`);
  if (!Array.isArray(product.features)) throw new Error(`Product ${product.id} features must be an array.`);
  if (!Array.isArray(product.sources)) throw new Error(`Product ${product.id} sources must be an array.`);

  if (typeof product.images.imageSourceType !== 'string') throw new Error(`Product ${product.id} images.imageSourceType is required.`);
  if (!product.images.primary || typeof product.images.primary.src !== 'string') throw new Error(`Product ${product.id} images.primary.src is required.`);
  if (!Array.isArray(product.images.gallery)) throw new Error(`Product ${product.id} images.gallery must be an array.`);
  if (!product.images.replacementTargets || typeof product.images.replacementTargets !== 'object') throw new Error(`Product ${product.id} images.replacementTargets is required.`);

  const imageSet = [product.images.primary, ...product.images.gallery];
  for (const img of imageSet) {
    if (typeof img.imageSourceType !== 'string') throw new Error(`Product ${product.id} image is missing imageSourceType.`);
    if (typeof img.src !== 'string') throw new Error(`Product ${product.id} image is missing src.`);
    const localImagePath = path.join(__dirname, img.src);
    if (!fs.existsSync(localImagePath)) throw new Error(`Product ${product.id} image not found on disk: ${img.src}`);
  }

  if (!product.compare || typeof product.compare !== 'object') throw new Error(`Product ${product.id} compare object is required.`);
  if (!Array.isArray(product.compare.platforms)) throw new Error(`Product ${product.id} compare.platforms must be an array.`);
  for (const key of ['driverSizeMm','batteryHours','msrpUSD','currentPriceUSD']) {
    if (!isNullableNumber(product.compare[key])) throw new Error(`Product ${product.id} compare.${key} must be number or null.`);
  }

  if (!product.imageBackfill || typeof product.imageBackfill !== 'object') throw new Error(`Product ${product.id} imageBackfill is required.`);
  if (!Array.isArray(product.imageBackfill.sourceCandidates)) throw new Error(`Product ${product.id} imageBackfill.sourceCandidates must be an array.`);
  if (!Array.isArray(product.imageBackfill.preferredSourceOrder)) throw new Error(`Product ${product.id} imageBackfill.preferredSourceOrder must be an array.`);
  if (!Array.isArray(product.imageBackfill.requiredViews)) throw new Error(`Product ${product.id} imageBackfill.requiredViews must be an array.`);
}

console.log(`Validation passed: ${payload.products.length} products checked.`);
