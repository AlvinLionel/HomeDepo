const crypto = require("crypto");
const mysql = require("mysql2/promise");
const path = require("path");
const { promisify } = require("util");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const scrypt = promisify(crypto.scrypt);
const PASSWORD_KEY_LENGTH = 64;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

let dbReady = false;
let dbMessage = "Database not initialized";

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, PASSWORD_KEY_LENGTH);
  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

async function verifyPassword(password, storedHash) {
  if (storedHash.startsWith("scrypt$")) {
    const [, salt, storedKey] = storedHash.split("$");
    if (!salt || !storedKey) return false;

    const derivedKey = await scrypt(password, salt, PASSWORD_KEY_LENGTH);
    const expectedKey = Buffer.from(storedKey, "hex");
    return expectedKey.length === derivedKey.length &&
      crypto.timingSafeEqual(expectedKey, derivedKey);
  }

  const legacyHash = crypto.createHash("sha256").update(password).digest("hex");
  const expectedHash = Buffer.from(storedHash, "hex");
  const actualHash = Buffer.from(legacyHash, "hex");
  return expectedHash.length === actualHash.length &&
    crypto.timingSafeEqual(expectedHash, actualHash);
}

async function checkDatabaseConnection() {
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.ping();
    dbReady = true;
    dbMessage = "Database connection successful";
    console.log("Connected to database successfully");
  } catch (error) {
    dbReady = false;
    dbMessage = error.message;
    console.error("Database connection failed:", error.message);
  } finally {
    if (connection) connection.release();
  }
}

function getStatus() {
  return { dbReady, dbMessage };
}

async function findUserByEmailOrUsername(email, username) {
  const [rows] = await pool.query(
    "SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1",
    [email, username]
  );
  return rows.length > 0;
}

async function createUser(username, email, password, accountType = "buyer") {
  const [result] = await pool.query(
    "INSERT INTO users (username, email, password_hash, account_type) VALUES (?, ?, ?, ?)",
    [username, email, await hashPassword(password), accountType]
  );
  return { id: result.insertId, username, email, accountType };
}

async function findUserByCredentials(email, password) {
  const [rows] = await pool.query(
    "SELECT id, username, email, password_hash, account_type FROM users WHERE email = ? LIMIT 1",
    [email]
  );
  const user = rows[0];
  if (!user || !(await verifyPassword(password, user.password_hash))) return null;

  if (!user.password_hash.startsWith("scrypt$")) {
    await pool.query(
      "UPDATE users SET password_hash = ? WHERE id = ?",
      [await hashPassword(password), user.id]
    );
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    accountType: user.account_type,
  };
}

async function updateLastLogin(userId, device) {
  await pool.query(
    "UPDATE users SET last_login_at = UTC_TIMESTAMP(), last_login_device = ? WHERE id = ?",
    [device, userId]
  );
}

async function getUserIdByEmail(email) {
  const [rows] = await pool.query(
    "SELECT id FROM users WHERE email = ? LIMIT 1",
    [email]
  );
  return rows.length > 0 ? rows[0].id : null;
}

async function resetPassword(token, newPassword) {
  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const [rows] = await connection.query(
      "SELECT user_id, expires_at FROM reset_tokens WHERE token = ? LIMIT 1 FOR UPDATE",
      [token]
    );

    if (rows.length === 0) {
      await connection.rollback();
      transactionStarted = false;
      return "invalid";
    }

    if (new Date(rows[0].expires_at) < new Date()) {
      await connection.rollback();
      transactionStarted = false;
      return "expired";
    }

    await connection.query(
      "UPDATE users SET password_hash = ? WHERE id = ?",
      [await hashPassword(newPassword), rows[0].user_id]
    );
    await connection.query("DELETE FROM reset_tokens WHERE token = ?", [token]);
    await connection.query("DELETE FROM user_sessions WHERE user_id = ?", [rows[0].user_id]);
    await connection.commit();
    transactionStarted = false;
    return "reset";
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function createResetToken(userId, token, expiresAt, device) {
  await pool.query(
    "INSERT INTO reset_tokens(user_id, token, expires_at, device) VALUES (?, ?, ?, ?)",
    [userId, token, expiresAt, device]
  );
}

async function createUserSession(userId, tokenHash) {
  await pool.query("DELETE FROM user_sessions WHERE expires_at <= UTC_TIMESTAMP()");
  await pool.query(
    "INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 DAY))",
    [userId, tokenHash]
  );
}

async function findUserBySession(tokenHash) {
  const [rows] = await pool.query(
    `SELECT users.id, users.username, users.email, users.account_type
     FROM user_sessions
     JOIN users ON users.id = user_sessions.user_id
     WHERE user_sessions.token_hash = ? AND user_sessions.expires_at > UTC_TIMESTAMP()
     LIMIT 1`,
    [tokenHash]
  );

  if (!rows[0]) return null;
  return {
    id: rows[0].id,
    username: rows[0].username,
    email: rows[0].email,
    accountType: rows[0].account_type,
  };
}

async function revokeUserSession(tokenHash) {
  await pool.query("DELETE FROM user_sessions WHERE token_hash = ?", [tokenHash]);
}

async function getAccountSettings(userId) {
  const [rows] = await pool.query(
    `SELECT users.username, users.email, user_settings.preferred_area,
            COALESCE(user_settings.show_contact_phone, FALSE) AS show_contact_phone
     FROM users
     LEFT JOIN user_settings ON user_settings.user_id = users.id
     WHERE users.id = ?
     LIMIT 1`,
    [userId]
  );
  if (!rows[0]) return null;

  return {
    username: rows[0].username,
    email: rows[0].email,
    preferredArea: rows[0].preferred_area || "",
    showContactPhone: Boolean(rows[0].show_contact_phone),
  };
}

async function updateAccountSettings(userId, settings) {
  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    await connection.query(
      "UPDATE users SET username = ? WHERE id = ?",
      [settings.username, userId]
    );
    await connection.query(
      `INSERT INTO user_settings (user_id, preferred_area, show_contact_phone)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         preferred_area = VALUES(preferred_area),
         show_contact_phone = VALUES(show_contact_phone)`,
      [userId, settings.preferredArea || null, settings.showContactPhone]
    );
    const [rows] = await connection.query(
      `SELECT users.username, users.email, user_settings.preferred_area,
              user_settings.show_contact_phone
       FROM users
       JOIN user_settings ON user_settings.user_id = users.id
       WHERE users.id = ?
       LIMIT 1`,
      [userId]
    );
    await connection.commit();
    transactionStarted = false;
    return {
      username: rows[0].username,
      email: rows[0].email,
      preferredArea: rows[0].preferred_area || "",
      showContactPhone: Boolean(rows[0].show_contact_phone),
    };
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function changeAccountPassword(userId, currentTokenHash, currentPassword, newPassword) {
  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const [rows] = await connection.query(
      "SELECT password_hash FROM users WHERE id = ? LIMIT 1 FOR UPDATE",
      [userId]
    );
    if (!rows[0] || !(await verifyPassword(currentPassword, rows[0].password_hash))) {
      await connection.rollback();
      transactionStarted = false;
      return false;
    }

    await connection.query(
      "UPDATE users SET password_hash = ? WHERE id = ?",
      [await hashPassword(newPassword), userId]
    );
    await connection.query(
      "DELETE FROM user_sessions WHERE user_id = ? AND token_hash <> ?",
      [userId, currentTokenHash]
    );
    await connection.query("DELETE FROM reset_tokens WHERE user_id = ?", [userId]);
    await connection.commit();
    transactionStarted = false;
    return true;
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function upgradeUserToSeller(userId) {
  const [result] = await pool.query(
    "UPDATE users SET account_type = 'seller' WHERE id = ? AND account_type = 'buyer'",
    [userId]
  );
  return result.affectedRows > 0;
}

async function getMarketplaceListings({ query, category, location, limit }) {
  const conditions = ["listings.status = 'active'"];
  const values = [];

  if (query) {
    conditions.push("(listings.title LIKE ? OR listings.description LIKE ?)");
    values.push(`%${query}%`, `%${query}%`);
  }
  if (category) {
    conditions.push("listings.category_slug = ?");
    values.push(category);
  }
  if (location) {
    conditions.push("listings.neighborhood LIKE ?");
    values.push(`%${location}%`);
  }

  const [rows] = await pool.query(
    `SELECT listings.id, listings.seller_id, listings.title, listings.description,
            listings.category_slug, listings.price, listings.condition_grade,
            listings.neighborhood, listings.image_url,
            CASE WHEN COALESCE(user_settings.show_contact_phone, FALSE) = TRUE
              THEN listings.contact_phone ELSE NULL END AS contact_phone,
            listings.created_at, users.username AS seller_name
     FROM marketplace_listings AS listings
     JOIN users ON users.id = listings.seller_id
     LEFT JOIN user_settings ON user_settings.user_id = users.id
     WHERE ${conditions.join(" AND ")}
     ORDER BY listings.created_at DESC
     LIMIT ?`,
    [...values, limit]
  );

  return rows.map((listing) => ({
    id: listing.id,
    sellerId: listing.seller_id,
    title: listing.title,
    description: listing.description,
    category: listing.category_slug,
    price: Number(listing.price),
    condition: listing.condition_grade,
    neighborhood: listing.neighborhood,
    imageUrl: listing.image_url,
    contactPhone: listing.contact_phone,
    createdAt: listing.created_at,
    sellerName: listing.seller_name,
  }));
}

async function getSellerListings(sellerId) {
  const [rows] = await pool.query(
    `SELECT id, title, description, category_slug, price, condition_grade,
            neighborhood, image_url, contact_phone, status, created_at
     FROM marketplace_listings
     WHERE seller_id = ?
     ORDER BY created_at DESC`,
    [sellerId]
  );

  return rows.map((listing) => ({
    id: listing.id,
    title: listing.title,
    description: listing.description,
    category: listing.category_slug,
    price: Number(listing.price),
    condition: listing.condition_grade,
    neighborhood: listing.neighborhood,
    imageUrl: listing.image_url,
    contactPhone: listing.contact_phone,
    status: listing.status,
    createdAt: listing.created_at,
  }));
}

async function createMarketplaceListing(sellerId, listing) {
  const [result] = await pool.query(
    `INSERT INTO marketplace_listings
       (seller_id, title, description, category_slug, price, condition_grade,
        neighborhood, image_url, contact_phone)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sellerId,
      listing.title,
      listing.description,
      listing.category,
      listing.price,
      listing.condition,
      listing.neighborhood,
      listing.imageUrl,
      listing.contactPhone,
    ]
  );

  return result.insertId;
}

async function updateMarketplaceListingStatus(listingId, sellerId, status) {
  const [result] = await pool.query(
    `UPDATE marketplace_listings
     SET status = ?
     WHERE id = ? AND seller_id = ? AND status IN ('active', 'sold')`,
    [status, listingId, sellerId]
  );

  return result.affectedRows > 0;
}

async function createMarketplaceListingReport(reporterId, { listingId, reason, details }) {
  const [result] = await pool.query(
    `INSERT INTO marketplace_listing_reports (listing_id, reporter_id, reason, details)
     SELECT listings.id, ?, ?, ?
     FROM marketplace_listings AS listings
     WHERE listings.id = ? AND listings.seller_id <> ? AND listings.status = 'active'`,
    [reporterId, reason, details, listingId, reporterId]
  );
  return result.affectedRows > 0;
}

async function getPendingMarketplaceListingReports(limit = 100) {
  const [rows] = await pool.query(
    `SELECT reports.id, reports.listing_id, reports.reporter_id, reports.reason,
            reports.details, reports.created_at, listings.title, listings.description,
            listings.neighborhood, listings.status AS listing_status,
            reporter.username AS reporter_name, seller.username AS seller_name,
            seller.email AS seller_email
     FROM marketplace_listing_reports AS reports
     JOIN marketplace_listings AS listings ON listings.id = reports.listing_id
     JOIN users AS reporter ON reporter.id = reports.reporter_id
     JOIN users AS seller ON seller.id = listings.seller_id
     WHERE reports.status = 'pending'
     ORDER BY reports.created_at ASC, reports.id ASC
     LIMIT ?`,
    [limit]
  );

  return rows.map((report) => ({
    id: report.id,
    listingId: report.listing_id,
    reporterId: report.reporter_id,
    reason: report.reason,
    details: report.details,
    createdAt: report.created_at,
    title: report.title,
    description: report.description,
    neighborhood: report.neighborhood,
    listingStatus: report.listing_status,
    reporterName: report.reporter_name,
    sellerName: report.seller_name,
    sellerEmail: report.seller_email,
  }));
}

async function reviewMarketplaceListingReport(reportId, moderatorId, action) {
  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const [reports] = await connection.query(
      `SELECT listing_id, status
       FROM marketplace_listing_reports
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      [reportId]
    );

    if (!reports[0]) {
      await connection.rollback();
      transactionStarted = false;
      return "not_found";
    }
    if (reports[0].status !== "pending") {
      await connection.rollback();
      transactionStarted = false;
      return "already_reviewed";
    }

    if (action === "dismiss") {
      await connection.query(
        `UPDATE marketplace_listing_reports
         SET status = 'dismissed', moderator_id = ?, reviewed_at = UTC_TIMESTAMP()
         WHERE id = ? AND status = 'pending'`,
        [moderatorId, reportId]
      );
    } else {
      await connection.query(
        `UPDATE marketplace_listings
         SET status = 'removed'
         WHERE id = ? AND status IN ('active', 'sold')`,
        [reports[0].listing_id]
      );
      await connection.query(
        `UPDATE marketplace_listing_reports
         SET status = 'listing_removed', moderator_id = ?, reviewed_at = UTC_TIMESTAMP()
         WHERE listing_id = ? AND status = 'pending'`,
        [moderatorId, reports[0].listing_id]
      );
    }

    await connection.commit();
    transactionStarted = false;
    return action === "dismiss" ? "dismissed" : "listing_removed";
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function createMerchantApplication(userId, application) {
  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    await connection.query("SELECT id FROM users WHERE id = ? FOR UPDATE", [userId]);
    const [pending] = await connection.query(
      "SELECT id FROM merchant_applications WHERE applicant_id = ? AND status = 'pending' LIMIT 1",
      [userId]
    );
    if (pending.length) {
      await connection.rollback();
      transactionStarted = false;
      return "pending_exists";
    }

    const [managedStores] = await connection.query(
      `SELECT merchant_stores.id
       FROM merchant_stores
       JOIN stores ON stores.id = merchant_stores.store_id
       WHERE merchant_stores.user_id = ?
         AND LOWER(TRIM(stores.name)) = LOWER(TRIM(?))
         AND LOWER(TRIM(stores.address)) = LOWER(TRIM(?))
       LIMIT 1`,
      [userId, application.storeName, application.address]
    );
    if (managedStores.length) {
      await connection.rollback();
      transactionStarted = false;
      return "already_managed";
    }

    const [result] = await connection.query(
      `INSERT INTO merchant_applications
         (applicant_id, store_name, description, address, phone)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, application.storeName, application.description, application.address, application.phone]
    );
    await connection.commit();
    transactionStarted = false;
    return result.insertId;
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getMerchantDashboard(userId) {
  const [applications] = await pool.query(
    `SELECT id, store_name, description, address, phone, status, created_at, reviewed_at
     FROM merchant_applications
     WHERE applicant_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [userId]
  );
  const [stores] = await pool.query(
    `SELECT stores.id, stores.name, stores.description, stores.address, stores.phone,
            stores.email, stores.created_at
     FROM merchant_stores
     JOIN stores ON stores.id = merchant_stores.store_id
     WHERE merchant_stores.user_id = ?
     ORDER BY stores.name`,
    [userId]
  );

  return { application: applications[0] || null, stores };
}

async function getPendingMerchantApplications(limit = 100) {
  const [rows] = await pool.query(
    `SELECT applications.id, applications.applicant_id, applications.store_name,
            applications.description, applications.address, applications.phone,
            applications.created_at, users.username AS applicant_name,
            users.email AS applicant_email
     FROM merchant_applications AS applications
     JOIN users ON users.id = applications.applicant_id
     WHERE applications.status = 'pending'
     ORDER BY applications.created_at ASC, applications.id ASC
     LIMIT ?`,
    [limit]
  );

  return rows.map((application) => ({
    id: application.id,
    applicantId: application.applicant_id,
    storeName: application.store_name,
    description: application.description,
    address: application.address,
    phone: application.phone,
    createdAt: application.created_at,
    applicantName: application.applicant_name,
    applicantEmail: application.applicant_email,
  }));
}

async function reviewMerchantApplication(applicationId, moderatorId, action) {
  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const [applications] = await connection.query(
      `SELECT applicant_id, store_name, description, address, phone, status
       FROM merchant_applications
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      [applicationId]
    );
    const application = applications[0];
    if (!application) {
      await connection.rollback();
      transactionStarted = false;
      return "not_found";
    }
    if (application.status !== "pending") {
      await connection.rollback();
      transactionStarted = false;
      return "already_reviewed";
    }

    if (action === "reject") {
      await connection.query(
        `UPDATE merchant_applications
         SET status = 'rejected', moderator_id = ?, reviewed_at = UTC_TIMESTAMP()
         WHERE id = ? AND status = 'pending'`,
        [moderatorId, applicationId]
      );
      await connection.commit();
      transactionStarted = false;
      return "rejected";
    }

    const [[applicant]] = await connection.query(
      "SELECT email FROM users WHERE id = ? LIMIT 1",
      [application.applicant_id]
    );
    const [existingStores] = await connection.query(
      `SELECT id
       FROM stores
       WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
         AND LOWER(TRIM(address)) = LOWER(TRIM(?))
       ORDER BY id
       LIMIT 1
       FOR UPDATE`,
      [application.store_name, application.address]
    );
    let storeId;
    if (existingStores[0]) {
      storeId = existingStores[0].id;
      await connection.query(
        "UPDATE stores SET is_active = TRUE WHERE id = ?",
        [storeId]
      );
    } else {
      const [storeResult] = await connection.query(
        `INSERT INTO stores (name, description, address, phone, email, is_active)
         VALUES (?, ?, ?, ?, ?, TRUE)`,
        [
          application.store_name,
          application.description,
          application.address,
          application.phone,
          applicant.email,
        ]
      );
      storeId = storeResult.insertId;
    }

    const [existingAssociation] = await connection.query(
      `SELECT id FROM merchant_stores
       WHERE user_id = ? AND store_id = ?
       LIMIT 1
       FOR UPDATE`,
      [application.applicant_id, storeId]
    );
    if (!existingAssociation.length) {
      await connection.query(
        `INSERT INTO merchant_stores (user_id, store_id, application_id)
         VALUES (?, ?, ?)`,
        [application.applicant_id, storeId, applicationId]
      );
    }
    await connection.query(
      `UPDATE merchant_applications
       SET status = 'approved', moderator_id = ?, reviewed_at = UTC_TIMESTAMP()
       WHERE id = ? AND status = 'pending'`,
      [moderatorId, applicationId]
    );
    await connection.commit();
    transactionStarted = false;
    return "approved";
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function importMerchantInventory(userId, storeId, products) {
  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const [access] = await connection.query(
      `SELECT id FROM merchant_stores
       WHERE user_id = ? AND store_id = ?
       LIMIT 1`,
      [userId, storeId]
    );
    if (!access.length) {
      await connection.rollback();
      transactionStarted = false;
      return "forbidden";
    }

    let inserted = 0;
    let updated = 0;
    for (const product of products) {
      const [mappings] = await connection.query(
        `SELECT product_id FROM merchant_product_skus
         WHERE store_id = ? AND sku = ?
         LIMIT 1`,
        [storeId, product.sku]
      );
      let productId = mappings[0]?.product_id;

      if (productId) {
        updated += 1;
      } else {
        const [matches] = await connection.query(
          `SELECT id FROM products
           WHERE department_slug = ?
             AND LOWER(TRIM(name)) = LOWER(TRIM(?))
             AND LOWER(TRIM(COALESCE(brand, ''))) = LOWER(TRIM(?))
           ORDER BY id
           LIMIT 1`,
          [product.departmentSlug, product.name, product.brand]
        );
        if (matches[0]) {
          productId = matches[0].id;
        } else {
          const [productResult] = await connection.query(
            `INSERT INTO products
               (department_slug, name, description, brand, unit, image_url)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              product.departmentSlug,
              product.name,
              product.description || null,
              product.brand || null,
              product.unit,
              product.imageUrl,
            ]
          );
          productId = productResult.insertId;
        }

        await connection.query(
          `INSERT INTO merchant_product_skus (store_id, sku, product_id)
           VALUES (?, ?, ?)`,
          [storeId, product.sku, productId]
        );
        inserted += 1;
      }

      await connection.query(
        `INSERT INTO store_products
           (store_id, product_id, price, stock_quantity, is_available)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           price = VALUES(price),
           stock_quantity = VALUES(stock_quantity),
           is_available = VALUES(is_available),
           updated_at = CURRENT_TIMESTAMP`,
        [storeId, productId, product.price, product.stockQuantity, product.stockQuantity > 0]
      );
    }

    await connection.commit();
    transactionStarted = false;
    return { inserted, updated };
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getProductsByDepartment(departmentSlug) {
  const [rows] = await pool.query(
    `
      SELECT
        p.id, p.name, p.description, p.brand, p.unit, p.image_url,
             MIN(sp.price) AS starting_price, COUNT(DISTINCT sp.store_id) AS store_count
      FROM products p
      JOIN store_products sp ON p.id = sp.product_id
      WHERE p.department_slug = ? AND sp.is_available = TRUE AND sp.stock_quantity > 0
      GROUP BY
        p.id, p.name, p.description, p.brand, p.unit, p.image_url
      ORDER BY p.name
    `,
    [departmentSlug]
  );

  return rows.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    brand: product.brand,
    unit: product.unit,
    imageUrl: product.image_url,
    startingPrice: Number(product.starting_price),
    storeCount: Number(product.store_count),
  }));
}

async function recordProductTrend({ productId, eventType, area, visitorHash }) {
  await pool.query(
    `INSERT IGNORE INTO product_trend_events
       (product_id, event_type, area, visitor_hash, event_date)
     SELECT id, ?, ?, ?, UTC_DATE()
     FROM products
     WHERE id = ?`,
    [eventType, area, visitorHash, productId]
  );
}

async function getTrendingProducts({ area, limit = 12 }) {
  const [rows] = await pool.query(
    `SELECT products.id, products.name, products.description, products.brand,
            products.image_url,
            MIN(store_products.price) AS starting_price,
            COUNT(DISTINCT store_products.store_id) AS store_count,
            COUNT(DISTINCT trends.visitor_hash) AS shopper_count,
            COUNT(DISTINCT CASE WHEN trends.event_type = 'search'
              THEN trends.visitor_hash END) AS searcher_count,
            COUNT(DISTINCT CASE WHEN trends.event_type = 'view'
              THEN trends.visitor_hash END) AS viewer_count
     FROM product_trend_events AS trends
     JOIN products ON products.id = trends.product_id
     JOIN store_products ON store_products.product_id = products.id
     JOIN stores ON stores.id = store_products.store_id
     WHERE trends.event_date >= DATE_SUB(UTC_DATE(), INTERVAL 6 DAY)
       AND (? = '' OR LOWER(trends.area) = LOWER(?))
       AND (? = '' OR LOWER(stores.address) LIKE CONCAT('%', LOWER(?), '%'))
       AND store_products.is_available = TRUE
       AND store_products.stock_quantity > 0
       AND stores.is_active = TRUE
     GROUP BY products.id, products.name, products.description, products.brand, products.image_url
     HAVING COUNT(DISTINCT trends.visitor_hash) >= 2
     ORDER BY shopper_count DESC, searcher_count DESC, viewer_count DESC,
              products.name ASC
     LIMIT ?`,
    [area, area, area, area, limit]
  );

  return rows.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    brand: product.brand,
    imageUrl: product.image_url,
    startingPrice: Number(product.starting_price),
    storeCount: Number(product.store_count),
    shopperCount: Number(product.shopper_count),
    searcherCount: Number(product.searcher_count),
    viewerCount: Number(product.viewer_count),
  }));
}

async function getProductById(productId) {
  const [rows] = await pool.query(
    `
      SELECT
        p.id AS product_id, p.name, p.description, p.brand, p.unit, p.image_url, s.id AS store_id, s.name AS store_name, s.address, s.phone, s.email, sp.price, sp.stock_quantity, sp.is_available
      FROM products p
      LEFT JOIN store_products sp ON p.id = sp.product_id
      LEFT JOIN stores s ON sp.store_id = s.id
      WHERE p.id = ?
      ORDER BY sp.price ASC
    `,
    [productId]
  );

  if (rows.length === 0) return null;

  return {
    id: rows[0].product_id,
    name: rows[0].name,
    description: rows[0].description,
    brand: rows[0].brand,
    unit: rows[0].unit,
    imageUrl: rows[0].image_url,

    stores: rows
      .filter((row) => row.store_id !== null)
      .map((row) => ({
        id: row.store_id,
        name: row.store_name,
        address: row.address,
        phone: row.phone,
        email: row.email,
        imageUrl: row.image_url,
        price: Number(row.price),
        stockQuantity: row.stock_quantity,
        isAvailable: Boolean(row.is_available),
      })),
  };
}

async function getProductsByStore(storeId) {
  const [rows] = await pool.query(
    `
      SELECT
        p.id, p.name, p.description, p.brand, p.unit, p.image_url, p.department_slug, sp.price, sp.stock_quantity, sp.is_available
      FROM store_products sp
      JOIN products p ON sp.product_id = p.id
      WHERE sp.store_id = ? AND sp.is_available = TRUE
      ORDER BY p.name
    `,
    [storeId]
  );

  return rows.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    brand: product.brand,
    unit: product.unit,
    imageUrl: product.image_url,
    departmentSlug: product.department_slug,
    price: Number(product.price),
    stockQuantity: product.stock_quantity,
    isAvailable: Boolean(product.is_available),
  }));
}

async function getStoreById(storeId) {
  const [rows] = await pool.query(
    `
      SELECT
        id, name, description, address, phone, email, latitude, longitude, is_active
      FROM stores
      WHERE id = ?
      LIMIT 1
    `,
    [storeId]
  );

  return rows[0] || null;
}

module.exports = {
  checkDatabaseConnection,
  getStatus,
  findUserByEmailOrUsername,
  createUser,
  findUserByCredentials,
  updateLastLogin,
  createUserSession,
  findUserBySession,
  revokeUserSession,
  getAccountSettings,
  updateAccountSettings,
  changeAccountPassword,
  upgradeUserToSeller,
  getUserIdByEmail,
  resetPassword,
  createResetToken,
  getProductsByDepartment,
  recordProductTrend,
  getTrendingProducts,
  getProductById,
  getProductsByStore,
  getStoreById,
  getMarketplaceListings,
  getSellerListings,
  createMarketplaceListing,
  updateMarketplaceListingStatus,
  createMarketplaceListingReport,
  getPendingMarketplaceListingReports,
  reviewMarketplaceListingReport,
  createMerchantApplication,
  getMerchantDashboard,
  getPendingMerchantApplications,
  reviewMerchantApplication,
  importMerchantInventory,
};
