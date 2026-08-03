// Step 2: merge new keys into en.json/kh.json and rewrite .vue templates
// to use {{ $t('key') }} instead of hardcoded text.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '..', 'src');
const EN_PATH = path.join(SRC, 'i18n', 'locales', 'en.json');
const KH_PATH = path.join(SRC, 'i18n', 'locales', 'kh.json');
const MAP = JSON.parse(fs.readFileSync(path.join(__dirname, 'i18n_map.json'), 'utf8'));
const KH_ADD = JSON.parse(fs.readFileSync(path.join(__dirname, 'i18n_kh.json'), 'utf8'));

// English overrides for labels that were previously hardcoded as bilingual
// Khmer + English strings (receipt labels).
const EN_OVERRIDES = {
  additionalDaysPrice: 'Additional Days Price',
  bookingId2: 'Booking ID',
  dateTime: 'Date & Time',
  discount2: 'Discount',
  grandTotal: 'Grand Total',
  insurance: 'Insurance',
  licensePlate: 'License Plate',
  originalPrice1Day: 'Original Price / 1 Day',
  paymentMethod2: 'Payment Method',
  phoneNumber2: 'Phone Number',
  pickupLocation: 'Pickup Location',
  rentalDuration: 'Rental Duration',
  shopOwner2: 'Shop Owner',
  totalAmount: 'Total Amount',
  vehicle2: 'Vehicle',
  vehicleSubtotal: 'Vehicle Subtotal',
};

const decodeEntities = (s) =>
  s
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&hearts;/g, '♥')
    .replace(/&times;/g, '×')
    .replace(/&raquo;/g, '»')
    .replace(/&mdash;/g, '—')
    .replace(/&hellip;/g, '…');

const collapse = (s) => decodeEntities(s).replace(/\s+/g, ' ').trim();

const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));
const kh = JSON.parse(fs.readFileSync(KH_PATH, 'utf8'));

const existingKeys = new Set(Object.keys(en));
const newEntries = []; // [key, enValue, khValue]
let missingKh = [];

for (const [key, text] of Object.entries(MAP)) {
  if (existingKeys.has(key)) continue; // reused key already present
  const enValue = EN_OVERRIDES[key] || collapse(text);
  const khValue = KH_ADD[key];
  if (khValue === undefined) {
    missingKh.push(key);
    continue;
  }
  newEntries.push([key, enValue, khValue]);
}

if (missingKh.length) {
  console.error('MISSING KH TRANSLATIONS FOR', missingKh.length, 'KEYS:');
  missingKh.forEach((k) => console.error('  -', k));
  process.exit(1);
}

// --- Append entries to en.json / kh.json preserving existing formatting ---
function appendToJson(filePath, entries) {
  let text = fs.readFileSync(filePath, 'utf8').trimEnd();
  const lines = text.split('\n');
  const lastLine = lines.pop().trim();
  if (lastLine !== '}') throw new Error(`Unexpected ending in ${filePath}`);
  const body = lines.join('\n').replace(/\s+$/, '');
  const needsComma = !body.endsWith(',');
  const block = entries
    .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`)
    .join(',\n');
  fs.writeFileSync(filePath, `${body}${needsComma ? ',' : ''}\n${block}\n}\n`);
}

if (newEntries.length > 0) {
  appendToJson(EN_PATH, newEntries.map(([k, e]) => [k, e]));
  appendToJson(KH_PATH, newEntries.map(([k, , h]) => [k, h]));
}
console.log(`Merged ${newEntries.length} new keys into en.json & kh.json`);

// --- Rewrite .vue templates ---
function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (f.endsWith('.vue')) out.push(p);
  }
  return out;
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

let changedFiles = 0;
let totalReplacements = 0;

for (const file of walk(SRC)) {
  const original = fs.readFileSync(file, 'utf8');
  const tplMatch = original.match(/<template>([\s\S]*)<\/template>/);
  if (!tplMatch) continue;

  let tpl = tplMatch[1];
  const originalTpl = tpl;
  for (const [key, text] of Object.entries(MAP)) {
    const re = new RegExp('>\\s*' + escapeRegExp(text) + '\\s*<', 'g');
    tpl = tpl.replace(re, () => `>{{ $t('${key}') }}<`);
  }

  // count replacements against the ORIGINAL template
  let count = 0;
  for (const [key, text] of Object.entries(MAP)) {
    const re = new RegExp('>\\s*' + escapeRegExp(text) + '\\s*<', 'g');
    const m = originalTpl.match(re);
    if (m) count += m.length;
  }

  if (count > 0) {
    // Use a FUNCTION replacement so '$' sequences inside the template
    // (e.g. currency literals like '$' ) are never interpreted.
    const newContent = original.replace(tplMatch[0], () => '<template>' + tpl + '</template>');
    fs.writeFileSync(file, newContent);
    changedFiles++;
    totalReplacements += count;
    console.log(`  ${path.relative(SRC, file)}: ${count} replacement(s)`);
  }
}

console.log(`Rewrote ${changedFiles} file(s) with ${totalReplacements} text-node replacements.`);
