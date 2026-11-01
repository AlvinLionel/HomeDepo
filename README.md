# HomeDepo

A modern e-commerce platform for discovering and purchasing home essentials. Browse products, find nearby stores, manage your cart, and explore curated home improvement services—all in one place.

## 🎯 Features

- **User Authentication** — Sign up and log in to access your personalized dashboard
- **Dashboard** — Welcome home with a quick overview of available features
- **Product Catalog** — Browse and explore home essentials and tools
- **Discovery** — Browse curated and trending products tailored to your needs
- **Map Integration** — Find nearby stores and services in real-time
- **Shopping Cart** — Save and manage your favorite products
- **Responsive Design** — Seamless experience across desktop and mobile devices

## 🛠️ Tech Stack

**Frontend:**
- React 19
- TypeScript
- Vite
- React Router DOM
- CSS (custom styling)

**Backend:**
- Node.js + Express 5
- MySQL 2
- Nodemon (dev)
- CORS enabled

**Database:**
- MySQL
- Structured user authentication and product data

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v16 or higher)
- **npm** (comes with Node.js)
- **MySQL** (v5.7 or higher)

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/AlvinLionel/homedepo.git
cd homeDepo-proj
```

### 2. Setup Database

```bash
cd Database

mysql -u your_username -p < schema.sql

```

After creating the base database, apply the migrations in order from the
repository root. Run these once per database:

```bash
mysql -u your_username -p homedepo < Database/migrations/001_neighborhood_marketplace.sql
mysql -u your_username -p homedepo < Database/migrations/002_reset_tokens.sql
mysql -u your_username -p homedepo < Database/migrations/003_product_trends.sql
mysql -u your_username -p homedepo < Database/migrations/004_listing_moderation.sql
mysql -u your_username -p homedepo < Database/migrations/005_merchant_onboarding.sql
mysql -u your_username -p homedepo < Database/migrations/006_account_settings.sql
```

The first migration adds buyer/seller account types, revocable sign-in sessions,
and peer-to-peer home listings. The second ensures password-reset storage is
present in existing databases. The third adds anonymous, daily-deduplicated
product search and view signals for the HomeX trends feed. Existing accounts
become buyer accounts. Any signed-in user can resell peer items with their
regular account; no separate seller profile is required. Existing SHA-256
password hashes are upgraded to salted scrypt hashes when their owners next
sign in. The fourth adds peer listing reports and the removed listing state.
The fifth adds merchant applications, approved store access, per-store SKUs
for atomic inventory imports, and the product image column on older databases.
The sixth adds persistent account settings for neighborhood and peer-listing
phone visibility.
Customer support requests are sent through the configured SMTP provider to
`SUPPORT_EMAIL`; configure environment values before enabling the support form.

Configure the backend from `Backend/.env.example` (copy it to `Backend/.env`),
then set the database connection and required service values before starting
the server. Set a real `SUPPORT_EMAIL`, sender identity, and SMTP credentials
to enable the support form; optional phone, WhatsApp, and hours fields remain
blank until you have real contact details to publish. Legacy Mailtrap
credentials remain supported for existing development setups.

### 3. Setup Backend

```bash
cd Backend

npm install

cat > .env << EOF
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=username
DB_PASSWORD=your_password
DB_NAME=homedepo
FRONTEND_URL=http://localhost:5173
MODERATOR_EMAILS=moderator@example.com
EOF

npm run dev
```

The backend will run on `http://localhost:5000`

All backend persistence queries and MySQL connection handling live in `Backend/db.js`. `server.js` uses its data-access functions so routes do not depend directly on MySQL. Switching database providers is therefore isolated from route logic, though the new provider may also require schema, environment, or dependency changes.

### 4. Setup Frontend

```bash
cd Frontend

npm install

npm run dev
```

The frontend will run on `http://localhost:5173` and automatically open in your browser.

Department card images are optimized local downloads from Unsplash and are used under the [Unsplash License](https://unsplash.com/license).

## 🏗️ Project Structure

```
homeDepo-proj/
├── Frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── App.tsx          # Main app component
│   │   ├── Auth.tsx         # Authentication component
│   │   ├── Home.tsx         # Dashboard home page
│   │   ├── Map.tsx          # Map view component
│   │   ├── Products.tsx     # Products catalog
│   │   ├── Discover.tsx     # Discovery catalog
│   │   ├── Cart.tsx         # Shopping cart
│   │   ├── main.tsx         # Entry point
│   │   └── ...
│   ├── components/          # Reusable React components
│   ├── styles/              # Global and component styles
│   ├── vite.config.ts       # Vite configuration
│   └── package.json
│
├── Backend/                 # Express.js backend
│   ├── server.js            # Main server file
│   ├── db.js                # Database connection and data-access layer
│   ├── .env                 # Environment variables
│   ├── tsconfig.json        # TypeScript config
│   ├── nodemon.json         # Nodemon config
│   └── package.json
│
├── Database/                # Database setup
│   ├── schema.sql           # Database schema
│   ├── init.js              # Database initialization script
│   └── ...
│
├── Images/                  # Project assets
├── README.md                # This file
└── package.json             # Root package.json
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/signup` — Create a new user account
- `POST /api/auth/login` — Log in with existing credentials
- `POST /api/auth/logout` — Revoke the current sign-in session

### Account settings
- `GET /api/account/settings` — Read your profile and account preferences (sign-in required)
- `PUT /api/account/settings` — Update display name, preferred area, and peer-listing phone visibility (sign-in required)
- `POST /api/account/password` — Change your password and sign out other sessions (sign-in required)

The settings workspace is available at `/settings`. A saved preferred area
pre-fills local marketplace and trend discovery. Phone numbers attached to peer
listings are hidden publicly unless the account owner enables phone sharing.
Email changes and notification delivery are not supported yet.

### Customer support
- `GET /api/support/contact` — Return configured public customer support channels
- `POST /api/support/contact` — Email a categorized support request to `SUPPORT_EMAIL` (SMTP configuration required)

The customer support page is available at `/contact`. Requests are sent to the
support mailbox and are not stored as tickets. The endpoint limits requests by
IP and validates message content; configure a production SMTP service before
accepting customer messages. `Backend/.env.example` lists all backend settings
without credentials.

### Products
- `GET /api/products/department/:departmentSlug` — Browse available products in a department
- `GET /api/products/:productId` — Get product and store offers
- `GET /api/stores/:storeId/products` — Browse products offered by a store

### Neighborhood marketplace
- `GET /api/marketplace/listings` — Browse active peer listings; supports `q`, `category`, `location`, and `limit` query parameters
- `POST /api/marketplace/listings` — Create a peer listing (sign-in required)
- `GET /api/marketplace/my-listings` — View your own listings (sign-in required)
- `PATCH /api/marketplace/listings/:id/status` — Mark your listing active or sold (sign-in required)
- `POST /api/marketplace/listings/:id/reports` — Report an active listing (sign-in required; one report per account per listing)

### Moderation
- `GET /api/moderation/listing-reports` — View pending reports (moderator account required)
- `PATCH /api/moderation/listing-reports/:reportId` — Dismiss a report or remove its listing (moderator account required)

Configure moderator email addresses as a comma-separated `MODERATOR_EMAILS`
environment variable. Moderator accounts must sign in with those configured
addresses; the API checks the allowlist on every moderation request. Never treat
the frontend moderator flag as an authorization control.

### Merchant onboarding and inventory
- `GET /api/merchant/dashboard` — View your applications and approved store workspaces (sign-in required)
- `POST /api/merchant/applications` — Apply to manage a local store catalog (sign-in required)
- `POST /api/merchant/stores/:storeId/inventory/import` — Atomically create/update store inventory from CSV (approved store manager required)
- `GET /api/moderation/merchant-applications` — Review pending store applications (moderator account required)
- `PATCH /api/moderation/merchant-applications/:applicationId` — Approve or reject an application (moderator account required)

The merchant portal is available at `/merchant`. Inventory CSV uses the
downloadable template headers, in order:
`sku,name,department_slug,description,brand,unit,image_url,price,stock_quantity`.
Imports are limited to 1.5 MB and 500 products per file. A store's SKU mapping
updates that store's price and stock; catalog details are not overwritten when
a SKU already exists. Existing matching store contact details are preserved
when a new merchant application is approved.

### Product trends
- `GET /api/trends/products?area=Kilimani` — Show products with recent search/view activity, matched to currently available stores in the selected area; omit `area` for HomeX-wide trends
- `POST /api/trends/events` — Record an anonymous product search or view

Trend counts cover the last seven days and are deduplicated per browser, product,
event type, and area per day. Results require at least two distinct browsers
and currently available stock; the anonymous browser identifier is hashed
before storage. Local trends use the general area a shopper enters, not precise
device location. Search/view participation is disclosed in the product browsing
experience.

### Basket
The basket is currently stored in the browser and supports adding catalog offers,
changing quantities, and removing items. It is not synced to an account and has
no checkout, order, or payment API yet.

## 💻 Development Scripts

### Frontend
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

### Backend
```bash
npm run dev      # Start with hot reload (nodemon)
npm run start    # Start production server
```

## 📝 Notes

- Make sure MySQL is running before starting the backend
- CORS is configured to accept requests from the frontend URL specified in `.env`
- User credentials are stored securely in the MySQL database
- Sign-in session tokens are stored in the browser and hashed in the database; sign out to revoke the current token
- Peer-to-peer listings support direct contact only when a seller chooses to include a phone number. Payments, in-app messaging, image uploads, moderation, and dispute handling are not implemented yet.

## 🤝 Contributing

This is a personal projects, proposals are however welcome

## 📄 License

ISC

---

Made with ❤️ by [AlvinLionel](https://github.com/AlvinLionel)