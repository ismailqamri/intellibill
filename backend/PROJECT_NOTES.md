# IntelliBill ERP - Master Roadmap

## Project Vision

IntelliBill is a GST-enabled ERP system for wholesalers, distributors, retailers, supermarkets, medical stores, and trading businesses.

The goal is to provide billing, inventory, accounting, purchase management, customer management, supplier management, reporting, PDF generation, OCR automation, communication, and business analytics in a single system.

---

# STATUS LEGEND

- ✅ Completed
- 🟡 In Progress
- ⏳ Pending
- 🔮 Future / Planned

---

# PHASE 1 - FOUNDATION

## Authentication & Authorization

- User Registration
- Login
- JWT Authentication
- Password Security

Status: ✅ Completed

> Note: Full Admin/Staff role permissions are part of Phase 6.

---

## Company Settings

- Company Information
- GST Details
- Bank Details
- UPI Details
- Invoice Settings
- Business Preferences

Status: 🟡 Frontend verification pending

---

## Product Management

- Add Product
- Update Product
- Delete Product
- Product Categories
- GST Rate
- HSN Code
- Reorder Level
- Stock Quantity
- Supplier Information

Status: ✅ Completed

---

## Customer Management

- Customer Details
- GST Number
- Customer Search
- Customer CRUD
- Customer Summary
- Customer Outstanding

Status: ✅ Core Management Completed

---

# PHASE 2 - SALES MANAGEMENT

## Invoice Management

- GST Invoice Creation
- Multiple Items
- Product Selection
- Manual Item Support
- MRP Including GST
- GST Calculation
- Partial Payments
- Multiple Payment Methods
- Outstanding Tracking
- Grand Total Override
- Invoice Editing

Status: ✅ Completed

---

## Invoice Payment Management

- Invoice Payment API
- Multiple Payments
- Outstanding Adjustment
- Payment Status Tracking
- Payment Method Tracking
- Ledger Integration

Status: ✅ Completed

---

## Customer Outstanding

- Customer Due Amount
- Customer Statement
- Payment History
- Outstanding Tracking

Status: 🟡 Customer summary completed; dedicated statement/history UI pending

---

## Customer Advances

- Advance Collection
- Advance Adjustment
- Advance History
- Remaining Advance Balance
- Auto Advance Consumption

Status: ✅ Completed

---

## Sales Returns

- Return Against Invoice
- Partial Item Returns
- Stock Restoration
- Outstanding Adjustment
- Return Validation
- Ledger Adjustment

Status: 🟡 Backend Completed; Frontend Pending

---

## Quotations

- Create Quotation
- Unlimited Items
- Manual Item Entry
- Convert To Invoice
- Validity Date
- PDF Export

Status: ⏳ Pending

---

# PHASE 3 - PURCHASE MANAGEMENT

## Supplier Management

- Supplier Details
- GST Number
- Credit Days
- Contact Details
- Supplier CRUD
- Supplier Summary

Status: ✅ Completed

---

## Purchase Management

- Purchase Bills
- Supplier Selection
- Product Selection
- Multiple Items
- Purchase Rate
- GST Calculation
- Supplier Payments
- Partial Payments
- Multiple Payment Methods
- Outstanding Balance
- Due Date Tracking
- Purchase History
- Purchase Details

Status: 🟡 Frontend Styling & Full Testing In Progress

---

## Purchase Payment Management

- Multiple Purchase Payments
- Outstanding Adjustment
- Payment Status Tracking
- Payment Method Tracking
- Ledger Integration

Status: ✅ Backend Completed

---

## Supplier Outstanding Report

- Total Purchases
- Total Paid
- Outstanding Balance
- Supplier Summary
- Supplier Purchase Account

Status: ✅ Completed

---

## Supplier Credits

- Credit Creation From Purchase Returns
- Remaining Credit Tracking
- Auto Credit Consumption
- Supplier Credit History

Status: ✅ Completed

---

## Purchase Returns

- Return To Supplier
- Partial Purchase Returns
- Stock Deduction
- Outstanding Adjustment
- Credit Creation
- Ledger Adjustment

Status: 🟡 Backend Completed; Frontend Pending

---

## Supplier Advances

- Advance Payment To Supplier
- Advance Adjustment
- Advance History
- Remaining Advance Balance

Status: ⏳ Pending

---

# PHASE 4 - INVENTORY MANAGEMENT

## Stock Management

- Stock Increase On Purchase
- Stock Decrease On Sale
- Stock Restoration On Sales Return
- Stock Reduction On Purchase Return
- Opening Stock

Status: 🟡 Core Stock Management Completed; Opening Stock UI Verification Pending

---

## Inventory Features

- Low Stock Alert
- Reorder Alert
- Stock Alerts
- Reorder Level
- Inventory Search
- Inventory CRUD

Status: ✅ Core Features Completed

---

## Advanced Inventory

- Expiry Tracking
- Batch Tracking
- Batch-wise Stock
- Expiry Alerts

Status: 🔮 Future

---

# PHASE 5 - ACCOUNTING

## Ledger System

- Ledger Schema
- Ledger APIs
- Sales Entries
- Purchase Entries
- Expense Entries
- Payment Tracking
- Customer Advance Entries
- Supplier Payment Entries
- Return Entries

Status: ✅ Core Ledger Completed

---

## Opening Balance

- Opening Cash
- Opening UPI
- Opening Bank
- Opening Stock
- Opening Customer Due
- Opening Supplier Due

Status: 🟡 Core Opening Balance Completed; Additional opening-balance flows need verification

---

## Cash Ledger

- Cash In
- Cash Out
- Cash Balance
- Payment Tracking

Status: ✅ Completed

---

## UPI Ledger

- UPI In
- UPI Out
- UPI Balance
- Payment Tracking

Status: ✅ Completed

---

## Bank Ledger

- Bank In
- Bank Out
- Bank Balance
- Payment Tracking

Status: ✅ Completed

---

## Owner Transactions

- Owner Withdrawal
- Owner Deposit
- Net Owner Balance

Status: ⏳ Pending

---

# PHASE 6 - STAFF MANAGEMENT

## Roles & Permissions

- Admin
- Staff
- Role Based Access
- Module Permissions
- Action Permissions

Status: ⏳ Pending

---

## Activity Logs

- Invoice Created By
- Purchase Created By
- Expense Added By
- Payment Recorded By
- Return Created By
- Login History

Status: ⏳ Pending

---

## Employee Signatures

- Digital Signature Upload
- Auto Signature On Invoice
- Employee-wise Signature

Status: ⏳ Pending

---

# PHASE 7 - EXPENSE MANAGEMENT

## Business Expenses

- Delivery Charges
- Fuel
- Salary
- Rent
- Electricity
- Internet
- Maintenance
- Purchase Expense
- Miscellaneous Expenses
- Expense Categories
- Expense Ledger Integration

Status: ✅ Completed

---

## Personal Transactions

- Owner Withdrawals
- Owner Deposits
- Personal Transaction Tracking

Status: ⏳ Pending Upgrade

---

# PHASE 8 - OCR & AUTOMATION

## Purchase OCR

- Scan GST Bills
- Scan Non-GST Bills
- Handwritten Bills
- OCR Verification Screen
- Extract Supplier Details
- Extract Invoice/Bill Number
- Extract Product Details
- Extract Quantity
- Extract Rate
- Extract GST
- Auto Product Creation

Status: ⏳ Pending

---

## Inventory OCR

- Add Stock From OCR
- Add Stock Manually
- OCR Verification
- Automatic Stock Update

Status: ⏳ Pending

---

## Predictive Procurement

- Sales-based demand analysis
- Inventory-based recommendations
- Reorder suggestions
- Purchase recommendations

Status: ⏳ Pending

---

# PHASE 9 - REPORTS & DASHBOARD

## Dashboard

- Today's Sales
- Today's Purchases
- Cash Balance
- UPI Balance
- Bank Balance
- Outstanding Customers
- Outstanding Suppliers
- Low Stock Products
- Stock Alerts
- Recent Invoices
- Sales Overview

Status: ✅ Completed

---

## Reports

### Sales Report

- Sales Summary
- Invoice Count
- Taxable Amount
- GST
- Grand Total
- Paid Amount
- Outstanding
- Payment Status

Status: ✅ Completed

---

### Purchase Report

- Purchase Summary
- Purchase Count
- Taxable Amount
- GST
- Grand Total
- Paid Amount
- Outstanding
- Payment Status

Status: ✅ Completed

---

### GST Report

- Sales GST
- Purchase GST
- CGST
- SGST
- IGST
- Total Tax
- Net GST

Status: ✅ Completed

---

### Expense Report

- Expense Summary
- Expense Categories
- Payment Methods
- Total Expenses

Status: ⏳ Pending

---

### Profit Report

- Sales
- Purchases
- Expenses
- Gross Profit
- Net Profit

Status: ⏳ Pending

---

### Customer Report

- Customer Sales
- Customer Payments
- Customer Outstanding
- Customer Statement

Status: ⏳ Pending

---

### Supplier Report

- Supplier Purchases
- Supplier Payments
- Supplier Outstanding
- Supplier Ledger

Status: 🟡 Supplier Summary Completed; Dedicated Report Pending

---

# PHASE 10 - COMMUNICATION & DOCUMENTS

## PDF Generation

### Invoice PDF

- GST Invoice
- Business Information
- Customer Information
- Invoice Number
- Invoice Date
- Item Details
- HSN
- Quantity
- MRP
- Taxable Amount
- CGST
- SGST
- IGST
- Grand Total
- Paid Amount
- Balance
- Payment Method
- Amount In Words

Status: ⏳ Pending

---

### Purchase PDF

- Purchase Bill
- Supplier Information
- Bill Number
- Purchase Date
- Item Details
- HSN
- Quantity
- Purchase Rate
- GST
- Grand Total
- Paid Amount
- Outstanding

Status: ⏳ Pending

---

### Reports PDF

- Sales Report PDF
- Purchase Report PDF
- GST Report PDF
- Expense Report PDF
- Profit Report PDF
- Customer Report PDF
- Supplier Report PDF

Status: ⏳ Pending

---

### Quotation PDF

- Quotation Details
- Customer Details
- Items
- Validity Date
- Terms & Conditions
- PDF Export

Status: ⏳ Pending

---

## WhatsApp Integration

- Send Invoice
- Send Quotation
- Outstanding Reminders
- Credit Follow-up
- Payment Confirmation

Status: ⏳ Pending

---

# PHASE 11 - USER EXPERIENCE & POLISH

## UI/UX

- Warm Ledger-inspired Design
- Responsive Layout
- Sidebar Navigation
- Top Navigation
- Dashboard UI
- Light Mode
- Dark Mode
- KPI Cards
- Tables
- Modals
- Forms
- Search
- Empty States
- Loading States
- Error States

Status: 🟡 Core UI Completed; Continuous Module Polish

---

## Mobile Responsiveness

- Desktop Layout
- Tablet Layout
- Mobile Layout
- Responsive Tables
- Responsive Forms
- Responsive Modals

Status: 🟡 Core Responsive Support Completed; Final Testing Pending

---

# PHASE 12 - FINAL TESTING & PRODUCTION

## Integration Testing

- Sales → Inventory
- Purchase → Inventory
- Sales → Customer Outstanding
- Purchase → Supplier Outstanding
- Sales Payment → Ledger
- Purchase Payment → Ledger
- Customer Advance → Invoice
- Supplier Credit → Purchase
- Sales Return → Inventory
- Purchase Return → Inventory
- Expense → Ledger
- Opening Balance → Ledger
- Reports → Transaction Data

Status: ⏳ Pending

---

## Security Testing

- JWT Authentication
- Protected Routes
- Authorization
- Input Validation
- API Error Handling
- Payment Validation
- Stock Validation
- Overpayment Prevention

Status: 🟡 Core Authentication & Protected APIs Completed; Final Security Review Pending

---

## Production Readiness

- Environment Variables
- Database Configuration
- API Configuration
- Error Logging
- Database Backup Strategy
- Deployment
- Production Build
- Final Testing

Status: ⏳ Pending

---

# CURRENT BACKEND STATUS

## Completed Backend Modules

- ✅ Authentication
- ✅ Products
- ✅ Customers
- ✅ Suppliers
- ✅ Purchases
- ✅ Purchase Payments
- ✅ Sales Invoices
- ✅ Invoice Payments
- ✅ Customer Advances
- ✅ Supplier Credits
- ✅ Sales Returns
- ✅ Purchase Returns
- ✅ Invoice Editing
- ✅ Expenses
- ✅ Ledger
- ✅ Dashboard
- ✅ Opening Balances
- ✅ Sales Reports
- ✅ Purchase Reports
- ✅ GST Reports

### Backend Completion

**~90%+ Core ERP Backend**

Remaining backend work is mainly:

- Supplier Advances
- Owner Transactions
- Staff Roles & Permissions
- Activity Logs
- Employee Signatures
- Additional Reports
- OCR
- WhatsApp
- Quotations
- Final security/integration work

---

# CURRENT FRONTEND STATUS

## Completed

- ✅ Dashboard
- ✅ Sales / Billing
- ✅ Inventory
- ✅ Customers
- ✅ Suppliers
- ✅ Accounting
- ✅ Reports
- ✅ Shared App Layout
- ✅ Sidebar Navigation
- ✅ Dark Mode
- ✅ Responsive Core UI

## In Progress

- 🟡 Purchases

## Pending

- ⏳ Returns UI
- ⏳ Customer Statement UI
- ⏳ Supplier Ledger/Report UI
- ⏳ Settings UI Verification
- ⏳ PDF Generation
- ⏳ Quotations
- ⏳ Staff Management UI
- ⏳ Remaining Reports UI
- ⏳ OCR UI
- ⏳ WhatsApp UI

---

# CURRENT DEVELOPMENT PRIORITY

## Priority 1 — Finish Purchases

- Complete Purchases UI styling
- Test purchase creation
- Test stock increase
- Test supplier credit
- Test purchase payment
- Test ledger entry
- Test outstanding balance
- Test purchase details

Status: 🟡 CURRENT

---

## Priority 2 — PDF Generation

Build reusable document generation system:

1. Invoice PDF
2. Purchase PDF
3. Reports PDF
4. Quotation PDF

Status: ⏳ NEXT

---

## Priority 3 — Returns Frontend

- Sales Return UI
- Purchase Return UI
- Return history
- Return details
- Stock verification
- Ledger verification

Status: ⏳ NEXT

---

## Priority 4 — Statements & Reports

- Customer Statement
- Supplier Ledger
- Expense Report
- Profit Report
- Customer Report
- Supplier Report

Status: ⏳

---

## Priority 5 — Settings

- Company Information
- GST Details
- Bank Details
- UPI Details
- Invoice Settings
- Business Preferences

Status: 🟡 Verification / Frontend Completion

---

## Priority 6 — Staff Management

- Admin / Staff
- Roles
- Permissions
- Activity Logs
- Employee Signatures

Status: ⏳

---

## Priority 7 — Automation

- Purchase OCR
- Inventory OCR
- Predictive Procurement

Status: ⏳

---

## Priority 8 — Communication

- WhatsApp Invoice
- WhatsApp Quotation
- Outstanding Reminders
- Credit Follow-up

Status: ⏳

---

# INTELLIBILL CURRENT ROADMAP

```text
PHASE 1   Foundation              🟢 Mostly Completed
PHASE 2   Sales                   🟢 Core Completed
PHASE 3   Purchases               🟡 In Progress
PHASE 4   Inventory               🟢 Core Completed
PHASE 5   Accounting              🟢 Core Completed
PHASE 6   Staff Management        🔴 Pending
PHASE 7   Expenses                🟢 Core Completed
PHASE 8   OCR & Automation        🔴 Pending
PHASE 9   Reports & Dashboard     🟢 Core Completed
PHASE 10  PDF & Communication     🔴 Pending
PHASE 11  UI/UX Polish            🟡 In Progress
PHASE 12  Testing & Production    🔴 Pending