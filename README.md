# JunkHub Backend API

Backend REST API for JunkHub - A marketplace platform for buying and selling junk items.

## Tech Stack

- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma
- **Authentication**: JWT with HTTP-only cookies
- **Validation**: Express Validator

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL database (Neon recommended)
- npm or yarn

## Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE=7d

# CORS
CORS_ORIGIN=http://localhost:5173
```

## Installation

```bash
# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Push database schema
npx prisma db push

# (Optional) Seed database with sample data
# The database will auto-seed on first run if empty
```

## Running the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication Routes (`/api/auth`)

#### User Authentication

- `POST /api/auth/register/user` - Register new user
- `POST /api/auth/login/user` - User login

#### Owner Authentication

- `POST /api/auth/register/owner` - Register new business owner (requires admin approval)
- `POST /api/auth/login/owner` - Owner login (only approved owners)

#### Admin Authentication

- `POST /api/auth/login/admin` - Admin login

#### General

- `GET /api/auth/me` - Get current authenticated user
- `POST /api/auth/logout` - Logout

### Admin Routes (`/api/admin`)

- `GET /api/admin/users` - Get all users
- `GET /api/admin/owners` - Get all owners
- `GET /api/admin/products` - Get all products
- `GET /api/admin/stats` - Get dashboard statistics
- `PUT /api/admin/owners/:id/approve` - Approve owner account
- `PUT /api/admin/products/:id/approve` - Approve product
- `PUT /api/admin/products/:id/reject` - Reject product
- `DELETE /api/admin/users/:id` - Delete user
- `DELETE /api/admin/owners/:id` - Delete owner
- `DELETE /api/admin/products/:id` - Delete product
- `GET /api/admin/profile` - Get admin profile
- `PUT /api/admin/profile` - Update admin profile
- `PUT /api/admin/profile/password` - Update admin password

### Shop Routes (`/api/shops`)

- `GET /api/shops` - Get all approved shops
- `GET /api/shops/:id` - Get shop details
- `GET /api/shops/owner/my-shops` - Get owner's shops (authenticated)
- `POST /api/shops` - Create new shop (authenticated owner)
- `PUT /api/shops/:id` - Update shop (authenticated owner)
- `DELETE /api/shops/:id` - Delete shop (authenticated owner)

### Product Routes (`/api/products`)

- `GET /api/products` - Get all approved products
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Create product (authenticated owner)
- `PUT /api/products/:id` - Update product (authenticated owner)
- `DELETE /api/products/:id` - Delete product (authenticated owner)

### Order Routes (`/api/orders`)

- `GET /api/orders/user` - Get user orders (authenticated user)
- `POST /api/orders` - Create order (authenticated user)
- `PUT /api/orders/:id/status` - Update order status (authenticated owner)

### Chat Routes (`/api/chats`)

User chats available at `/api/chats` and owner chats at `/api/owner-chats`

### Notification Routes

- `/api/notifications` - User notifications
- `/api/owner-notifications` - Owner notifications

## Database Schema

The database uses the following main models:

- **User** - Platform users/customers
- **Owner** - Business owners (requires approval)
- **Admin** - Platform administrators
- **Shop** - Owner's shops/stores
- **Product** - Items for sale (requires approval)
- **Order** - User purchase orders
- **OrderItem** - Individual items in orders
- **Review** - Product reviews
- **Chat** - Conversations between users and owners
- **Message** - Chat messages
- **Notification** - System notifications

## Security Features

- JWT-based authentication
- HTTP-only cookies for token storage
- Password hashing with bcrypt
- Owner approval system (prevents unauthorized business accounts)
- Product approval system (admins review before listing)
- Role-based access control (User, Owner, Admin)

## Development

```bash
# View database in Prisma Studio
npx prisma studio

# Reset database (WARNING: deletes all data)
npx prisma db push --force-reset

# Generate new migration
npx prisma migrate dev --name migration_name
```

## Project Structure

```
backend/
├── config/           # Configuration files
├── lib/              # Shared libraries (Prisma client)
├── middleware/       # Express middleware (auth, validation)
├── prisma/           # Prisma schema and migrations
├── routes/           # API route handlers
├── utils/            # Utility functions (JWT, password hashing)
└── main.js           # Application entry point
```

## Notes

- Owner accounts must be approved by admins before they can access owner features
- Products must be approved by admins before appearing on the platform
- The server auto-seeds sample data on first run if the database is empty
- All authentication uses HTTP-only cookies for enhanced security
