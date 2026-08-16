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
# Navigate to the Database folder
cd Database

# Initialize the database using your MySQL client
mysql -u your_username -p < schema.sql

# Or run the init.js file (ensure Node.js is installed)
node init.js
```

> **Note:** Update your MySQL credentials in the `.env` file before running init.js

### 3. Setup Backend

```bash
cd Backend

# Install dependencies
npm install

# Create a .env file in the Backend folder
# Add the following environment variables:
cat > .env << EOF
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=homedepot
FRONTEND_URL=http://localhost:5173
EOF

# Start the backend development server
npm run dev
```

The backend will run on `http://localhost:5000`

### 4. Setup Frontend

```bash
cd Frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will run on `http://localhost:5173` and automatically open in your browser.

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

### Products
- `GET /api/products` — Get all products
- `GET /api/products/:id` — Get product details

### Cart
- `POST /api/cart` — Add item to cart
- `GET /api/cart/:userId` — Get user's cart
- `DELETE /api/cart/:itemId` — Remove item from cart

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

## 🔐 Environment Variables

### Backend (.env)
```
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=homedepot
FRONTEND_URL=http://localhost:5173
```

## 📝 Notes

- The database initialization script will create all necessary tables automatically
- Make sure MySQL is running before starting the backend
- CORS is configured to accept requests from the frontend URL specified in `.env`
- User credentials are stored securely in the MySQL database

## 🤝 Contributing

Contributions are welcome! Feel free to fork the repository and submit pull requests.

## 📄 License

ISC

---

Made with ❤️ by [AlvinLionel](https://github.com/AlvinLionel)