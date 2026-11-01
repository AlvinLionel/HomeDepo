const MAX_INVENTORY_ROWS = 500;
const MAX_FIELD_LENGTH = 2000;
const departments = new Set([
  "furniture", "appliances", "entertainment", "kitchenware", "home-decor",
  "seasonal", "textiles", "lighting", "outdoor", "pets", "fitness",
]);
const requiredColumns = [
  "sku", "name", "department_slug", "description", "brand", "unit",
  "image_url", "price", "stock_quantity",
];

function parseCsvRecords(input) {
  const records = [];
  let record = [];
  let field = "";
  let quoted = false;
  let afterQuote = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
        afterQuote = true;
      } else {
        field += character;
      }
      continue;
    }

    if (afterQuote && character !== "," && character !== "\r" && character !== "\n" && character !== " " && character !== "\t") {
      throw new Error("CSV contains unexpected characters after a quoted field.");
    }
    if (character === '"') {
      if (field.trim()) throw new Error("CSV contains a quote inside an unquoted field.");
      field = "";
      quoted = true;
      afterQuote = false;
    } else if (character === ",") {
      record.push(field.trim());
      field = "";
      afterQuote = false;
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && input[index + 1] === "\n") index += 1;
      record.push(field.trim());
      if (record.some((value) => value.length > 0)) records.push(record);
      record = [];
      field = "";
      afterQuote = false;
    } else if (!afterQuote) {
      field += character;
    }
  }

  if (quoted) throw new Error("CSV has an unclosed quoted field.");
  record.push(field.trim());
  if (record.some((value) => value.length > 0)) records.push(record);
  return records;
}

function parseInventoryCsv(input) {
  if (typeof input !== "string" || !input.trim())     throw new Error("Choose a non-empty CSV file.");
  
  if (Buffer.byteLength(input, "utf8") > 1_500_000)     throw new Error("CSV file must be 1.5 MB or smaller.");
  
  const records = parseCsvRecords(input.replace(/^\uFEFF/, ""));
  if (records.length < 2) throw new Error("Add a header row and at least one product.");

  if (records.length - 1 > MAX_INVENTORY_ROWS)     throw new Error(`Import no more than ${MAX_INVENTORY_ROWS} products at a time.`);
  
  const headers = records[0].map((header) => header.toLowerCase());
  if (headers.length !== requiredColumns.length || requiredColumns.some((column, index) => headers[index] !== column)) {
    throw new Error(`CSV headers must be in this order: ${requiredColumns.join(", ")}.`);
  }

  const seenSkus = new Set();
  return records.slice(1).map((record, index) => {
    const lineNumber = index + 2;
    if (record.length !== requiredColumns.length) {
      throw new Error(`Row ${lineNumber} must contain ${requiredColumns.length} columns.`);
    }
    if (record.some((value) => value.length > MAX_FIELD_LENGTH)) {
      throw new Error(`Row ${lineNumber} contains a field longer than ${MAX_FIELD_LENGTH} characters.`);
    }

    const [sku, name, departmentSlug, description, brand, unit, imageUrl, rawPrice, rawStock] = record;
    
    if (!sku || sku.length > 100) throw new Error(`Row ${lineNumber}: SKU is required (100 characters maximum).`);
    const normalizedSku = sku.toLocaleLowerCase();
    
    if (seenSkus.has(normalizedSku)) throw new Error(`Row ${lineNumber}: SKU "${sku}" appears more than once.`);
    seenSkus.add(normalizedSku);
    if (!name || name.length > 200) throw new Error(`Row ${lineNumber}: product name is required (200 characters maximum).`);
    
    if (!departments.has(departmentSlug)) throw new Error(`Row ${lineNumber}: choose a supported department slug.`);
    
    if (!unit || unit.length > 50) throw new Error(`Row ${lineNumber}: unit is required (50 characters maximum).`);

    const price = Number(rawPrice);
    const stockQuantity = Number(rawStock);
    if (!Number.isFinite(price) || price <= 0 || price > 100_000_000) {
      throw new Error(`Row ${lineNumber}: price must be greater than zero and at most 100,000,000.`);
    }
    if (!Number.isInteger(stockQuantity) || stockQuantity < 0 || stockQuantity > 1_000_000) {
      throw new Error(`Row ${lineNumber}: stock quantity must be a whole number from 0 to 1,000,000.`);
    }
    if (imageUrl) {
      try {
        const parsed = new URL(imageUrl);
        if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Invalid URL protocol.");
      } catch {
        throw new Error(`Row ${lineNumber}: image_url must be a valid HTTP(S) URL or blank.`);
      }
    }

    return {
      sku,
      name,
      departmentSlug,
      description,
      brand,
      unit,
      imageUrl: imageUrl || null,
      price,
      stockQuantity,
    };
  });
}

module.exports = { parseInventoryCsv };
