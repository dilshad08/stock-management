# Hardware Shop Admin & Billing Panel (NestJS + MongoDB Mongoose + EJS MVC)

A modern, high-performance Hardware Store Management and Point of Sale (POS) application built with **NestJS**, **MongoDB (Mongoose ORM)**, and **EJS with MVC architecture**.

---

## 🛠️ Features Implemented

### 1. Product Catalog & Inventory Management
- **Add Product**: Form to add items with SKU, Category, Cost Price, Selling Price, Stock Quantity, Unit of Measure (pcs, box, kg, meter, etc.), and Description.
- **Inventory Metrics**: Top counters displaying **Total Catalog Size**, **In Stock Items (≥ 10)**, **Low Stock Items (< 10)**, and **Sold Out (0)**.
- **Stock Quantity Low Alert (Red Color)**:
  - Any product with stock **quantity < 10** is rendered in **bold red color** with a glowing red low-stock alert badge (`< 10 Critical`).
  - Row is subtly highlighted in red with a left border accent for high visibility.
  - Dedicated **"Low Stock (< 10)"** filter tab to review all depleted inventory in 1 click.
- **Quick Restock Modal**: Instantly restock items without leaving the list.
- **Edit & Delete**: Full CRUD controls with confirmation dialogs.

### 2. POS Billing Counter & Sell Products
- **Visual Product Picker**: Interactive catalog picker showing real-time available stock and unit price.
- **Multi-Item Cart**: Add multiple products, adjust quantities with `+` / `-` steppers, with automatic safeguards preventing overselling beyond stock.
- **Discount Percentage on Total Amount**:
  - Live discount input where you can enter any percentage (e.g., 5%, 10%, 15%).
  - Quick-click preset buttons (`0%`, `5%`, `10%`, `15%`, `20%`).
  - Automatically calculates `Subtotal`, `Discount Amount (-$X.XX)`, and `Net Total Payable`.
- **Automatic Stock Deduction**: Automatically reduces inventory quantities upon completing the sale and tracks units sold.

### 3. PDF Bill Generation & Invoicing
- **One-Click PDF Download**: Generates vector PDF bills using pure Node.js (`PDFKit`) via `/sales/:id/pdf`.
- **Professional Hardware Store Invoice**: Includes store logo, GST/Tax registration number, customer contact details, itemized table with SKU, unit price, quantity, line total, discount breakdown, authorized signatory line, and return policy.
- **Printable Browser View**: Printable receipt layout with `Print Bill` trigger.

### 4. Sales Report & Product Performance
- **Units Sold per Product**: Displays exactly how many units each hardware product has sold.
- **Total Revenue per Product**: Product-wise revenue calculations and percentage share of total store sales.
- **Interactive Visual Charts**: Chart.js charts showing top-selling products by quantity and revenue contribution.
- **Time Filters**: Filter reports by **All Time**, **Today**, **Last 7 Days**, or **This Month**.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **MongoDB** running locally on port `27017` (e.g. `mongodb://localhost:27017`)

### 2. Installation
Dependencies are already installed. If needed, run:
```bash
npm install
```

### 3. Seed Database with Realistic Hardware Products & Sales
```bash
npm run seed
```
This populates 15 realistic hardware items (drills, hammers, angle grinders, pipes, valves, flood lights, wires, screws, multimeters), includes low-stock products (< 10) to test red alerts, sold-out items, and sample sales invoices with discounts.

### 4. Run the Application
```bash
# Development mode with hot-reload:
npm run start:dev

# Or Production mode:
npm run build
npm run start:prod
```

The application is accessible at:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 📁 Project Architecture (MVC)

```
hardware/
├── public/
│   ├── css/
│   │   └── style.css          # Glassmorphic dark theme, red low-stock badges, responsive layout
│   └── js/
│       └── main.js            # Client POS cart calculation, discount %, and restock modal
├── src/
│   ├── app.controller.ts      # Store dashboard with metric aggregations
│   ├── app.module.ts          # Root module with MongoDB connection
│   ├── main.ts                # App bootstrapper (Express + EJS engine + Static assets)
│   ├── seed.ts                # Database seeder script
│   ├── products/
│   │   ├── product.schema.ts  # Mongoose Product model
│   │   ├── products.service.ts # Inventory queries, low-stock filter & aggregations
│   │   ├── products.controller.ts # Product CRUD & MVC views
│   │   └── products.module.ts
│   ├── sales/
│   │   ├── sale.schema.ts     # Mongoose Sale & SaleItem model
│   │   ├── sales.service.ts   # Checkout, stock deduction & discount calculations
│   │   ├── sales.controller.ts # POS billing & invoice views
│   │   ├── pdf.service.ts     # PDFKit vector invoice generator
│   │   └── sales.module.ts
│   └── reports/
│       ├── reports.service.ts # Product-wise sales aggregation
│       ├── reports.controller.ts # Sales report view with Chart.js
│       └── reports.module.ts
└── views/
    ├── layout/
    │   ├── header.ejs         # Sidebar navigation, brand logo, FontAwesome & Chart.js CDN
    │   └── footer.ejs         # Restock modal & client scripts
    ├── dashboard.ejs          # Store overview, stat cards, low stock alerts, recent sales
    ├── products/
    │   ├── index.ejs          # Inventory table with red low stock (<10) rows & status counters
    │   ├── add.ejs            # Add new product form
    │   └── edit.ejs           # Edit product form
    ├── sales/
    │   ├── index.ejs          # Invoices list with discount badges & PDF links
    │   ├── new.ejs            # POS billing counter with discount % option
    │   └── view.ejs           # Invoice bill view with "Download PDF" & "Print"
    └── reports/
        └── sales.ejs          # Sales report (units sold & total amounts per product)
```

---

## 🌐 Key Routes

| Route | Method | Description |
|---|---|---|
| `/dashboard` | `GET` | Dashboard with stock counters, low stock alerts, and recent sales |
| `/products` | `GET` | Product catalog with stock quantity; **items < 10 show in RED** |
| `/products?status=low_stock` | `GET` | Filter only low stock items (< 10) |
| `/products/new` | `GET` | Add new product form |
| `/products` | `POST` | Create a product |
| `/products/:id/edit` | `GET/POST` | Edit existing product |
| `/products/:id/restock` | `POST` | Quick restock quantity |
| `/products/:id/delete` | `POST` | Delete a product |
| `/sales/new` | `GET` | POS Sell screen with multi-item cart & discount % |
| `/sales` | `POST` | Process sale, deduct stock, create invoice |
| `/sales` | `GET` | View all sales invoices and discount totals |
| `/sales/:id` | `GET` | View bill with printable invoice layout |
| `/sales/:id/pdf` | `GET` | **Download PDF bill / invoice** |
| `/reports/sales` | `GET` | **Sales report: units sold & total amounts per product** |
