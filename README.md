# IntelliBill ERP

A GST-enabled ERP and billing system for wholesalers, distributors, retailers, supermarkets, medical stores and trading businesses. IntelliBill brings billing, inventory, purchases, accounting, customer/supplier management and reporting into a single application.

> **Status:** Under active development. The core backend is ~90% complete; the frontend is being finished module by module.

---

## Features

### Sales
- GST invoice creation with multiple items and MRP-inclusive pricing (GST is extracted automatically)
- Walk-in customers or saved customers
- Partial payments, multiple payment methods (cash, UPI, bank, card)
- Editable grand total (discount/round-off, never above the calculated total)
- Customer advances with automatic consumption on new invoices
- Sales returns with stock restoration and outstanding adjustment
- Auto-incrementing invoice numbers per financial year (e.g. `1/26-27`)

### Purchases
- Purchase bills linked to suppliers and inventory products
- Per-item GST, discounts, round-off, due dates
- Supplier payments (initial and later) with overpayment protection
- Supplier credits created from purchase returns and auto-applied to new purchases
- Purchase returns with stock deduction

### Inventory
- Product CRUD with category, MRP, GST rate, HSN code, reorder level
- Automatic stock changes on sales, purchases and returns
- Low-stock and out-of-stock alerts

### Accounting
- Double-direction ledger (credit/debit) for cash, UPI, bank and card
- Opening balances, business expenses, running balances
- Payments, advances and returns automatically post to the ledger

### Reports & Dashboard
- Dashboard: sales, purchases, balances, outstanding amounts, low stock, recent invoices, sales trend chart
- Sales, Purchase and GST reports with date filters (CGST / SGST / IGST, net GST)

### UI
- Warm, ledger-inspired design with light and dark themes
- Collapsible sidebar, responsive layout, POS-style invoice screen with keyboard shortcuts (`F2` find product, `Ctrl/Cmd + S` save)

---

## Tech Stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, lucide-react |
| Backend   | Node.js, Express 5, Mongoose 9 |
| Database  | MongoDB |
| Auth      | JWT (`jsonwebtoken`), `bcryptjs` password hashing |

---

## Project Structure

```
.
├── backend/
│   ├── config/            # MongoDB connection
│   ├── controllers/       # Business logic (invoices, purchases, ledger, reports, ...)
│   │   └── reports/       # Sales, purchase and GST report controllers
│   ├── middleware/        # JWT auth middleware
│   ├── models/            # Mongoose schemas
│   ├── routes/            # Express routers
│   ├── PROJECT_NOTES.md   # Detailed roadmap and status
│   └── server.js          # App entry point
└── frontend/
    └── src/
        ├── app/           # Next.js pages (dashboard, sales, inventory, ...)
        ├── components/    # AppShell and invoice UI components
        ├── hooks/         # useInvoice (invoice state + calculations)
        └── lib/           # Shared helpers (invoice math)
```

---

## Getting Started

### Prerequisites
- Node.js 18+ (20+ recommended)
- A MongoDB instance (local or MongoDB Atlas)

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=5001
MONGODB_URI=mongodb://localhost:27017/intellibill
JWT_SECRET=replace-with-a-long-random-secret
```

Start the server:

```bash
npm run dev     # development (nodemon)
npm start       # production
```

The API runs at `http://localhost:5001`.

### 3. Frontend setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5001/api
```

Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. First-time configuration

1. Register a user via `POST /api/auth/register`, then sign in on the login page.
2. Create **Company Settings** via `POST /api/settings` (company name, GST number, address, phone, `currentInvoiceNumber`, `financialYear`). Invoice creation requires this to exist.
3. Optionally set an **Opening Balance** from the Accounting page.

---

## API Overview

Base URL: `/api`

| Module | Endpoints |
|--------|-----------|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| Products | `GET/POST /products`, `GET/PUT/DELETE /products/:id` |
| Customers | `GET/POST /customers`, `GET/PUT/DELETE /customers/:id`, `GET /customers/:id/summary` |
| Suppliers | `GET/POST /suppliers`, `GET/PUT/DELETE /suppliers/:id`, `GET /suppliers/:id/summary` |
| Company Settings | `GET/POST /settings` |
| Invoices | `GET/POST /invoices`, `GET /invoices/:id`, `POST /invoices/:id/payment` |
| Invoice Editing | `PUT /invoice-edit/:id` |
| Purchases | `GET/POST /purchases`, `GET /purchases/:id`, `POST /purchases/:id/payment` |
| Sales Returns | `POST /sales-returns` |
| Purchase Returns | `POST /purchase-returns` |
| Customer Advances | `GET/POST /customer-advances`, `GET /customer-advances/customer/:id` |
| Supplier Credits | `GET /supplier-credits`, `GET /supplier-credits/supplier/:id` |
| Expenses | `GET/POST /expenses` |
| Ledger | `GET /ledger`, `GET /ledger/summary` |
| Opening Balance | `GET/POST /opening-balance` |
| Dashboard | `GET /dashboard` |
| Reports | `GET /reports/sales`, `GET /reports/purchases`, `GET /reports/gst` (query: `from`, `to` as `YYYY-MM-DD`) |

Protected routes expect an `Authorization: Bearer <token>` header.

---

## Roadmap

| Phase | Area | Status |
|-------|------|--------|
| 1 | Foundation (auth, products, customers, settings) | Mostly complete |
| 2 | Sales (invoices, payments, advances, returns) | Core complete; returns UI pending |
| 3 | Purchases and suppliers | In progress |
| 4 | Inventory | Core complete |
| 5 | Accounting and ledgers | Core complete |
| 6 | Staff roles, permissions, activity logs, signatures | Planned |
| 7 | Expenses | Core complete |
| 8 | OCR and automation (bill scanning, predictive procurement) | Planned |
| 9 | Reports and dashboard | Core complete; more reports pending |
| 10 | PDF generation and WhatsApp integration | Planned |
| 11 | UI/UX polish and mobile testing | In progress |
| 12 | Integration testing and production readiness | Planned |

Upcoming work includes: finishing the Purchases UI, PDF generation (invoice, purchase, reports, quotations), returns UI, customer statements and supplier ledgers, quotations, supplier advances, owner transactions, staff management, OCR, and WhatsApp reminders. See [`backend/PROJECT_NOTES.md`](backend/PROJECT_NOTES.md) for the full breakdown.

---

## Known Limitations

- Role-based access control is not implemented yet (users have an `admin`/`staff` role field, but permissions are not enforced).
- Some routes (e.g. invoices, returns, reports, dashboard, settings) are not yet behind the JWT `protect` middleware. Apply it before any production deployment.
- Sales/purchase returns are not yet reflected in the GST report.
- Invoice editing recalculates totals without the MRP-inclusive GST logic used at creation time.

---

## Scripts

**Backend**

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with nodemon |
| `npm start` | Start with Node |

**Frontend**

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint |

---

## License

ISC. Add a `LICENSE` file to the repository if you plan to distribute the project.
