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
mysql -u your_username -p homedepo < Database/migrations/007_community_services.sql
```

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

## API Documentation

The backend publishes an interactive OpenAPI reference at
`http://localhost:5000/api/docs` while the server is running. The machine-readable
OpenAPI 3 definition is in [`Backend/openapi.yaml`](./Backend/openapi.yaml) and
is also served at `/api/openapi.yaml`. API paths, authentication, parameters,
request bodies, and response codes belong in the OpenAPI definition rather than
being duplicated in this README.

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