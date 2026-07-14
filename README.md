# ⚡ EpicStore - Neo-Brutalist E-Commerce Storefront

EpicStore is a modern, ultra-responsive, fully type-safe e-commerce web application featuring a distinct **Neo-Brutalist design** aesthetic. Built with Next.js 15, tRPC, Hono, and a resilient Redis architecture.

---

## 🎨 Design Philosophy: Neo-Brutalism
Unlike generic, minimalist modern UI templates, EpicStore uses a striking **Neo-Brutalist style** which features:
* **High Contrast Elements:** Thick borders (`3px solid #000000`) and flat, hard drop shadows without blur (`box-shadow: 6px 6px 0px #000000`).
* **Tactile Interactions:** Buttons, forms, and product cards lift up-left on hover and sink down-right when clicked.
* **Premium Custom Overlays:** The horizontal category scrollbar is completely hidden and masked with a smooth gradient fade-out overlay on the right, signaling touch-swipe capabilities and replacing native browser scrolls.
* **Base64 SVG Covers:** Dynamically generated neon vector images automatically back up any new product created by the admin panel if no image URL is provided.

---

## 🛠️ Technology Stack
* **Frontend (FE):** Next.js 15 (App Router) + React 19 + TanStack React Query + tRPC Client.
* **Backend (BE):** tRPC Server mounted as middleware on Hono (Next.js Route Handler).
* **Styling:** Custom Vanilla CSS Design System (`app/globals.css`).
* **Database & Caching:** Redis (`ioredis`) with a built-in **Resilient In-Memory DB Fallback**. If Redis is unavailable, the application switches to an internal state store instantly (0ms lag).
* **Package Management:** NPM with optimized runner scripts to bypass Termux/Android shebang loading errors.

---

## ⚙️ Core Features
1. **Interactive Catalog Storefront (`/`):** Real-time text searching and category filtering.
2. **tactile Cart Drawer:** Sidebar drawer supporting item increments, decrements, full item removals, and real-time subtotal summation.
3. **Admin Dashboard Panel (`/admin`):** Full inventory CRUD operations (Create, Read, Update, Delete products) directly hooked to tRPC mutations.
4. **Order Invoicing History:** Checks out active cart products, reduces inventory stock, registers invoices, and logs receipts under user order histories.
5. **Zero-Lag Database Failover:** Configured to disable offline command queueing. If Redis goes down, the client fails fast and switches to memory variables, avoiding standard 11-second TCP hanging.

---

## 📂 Project Directory Structure
```text
ecommerce-app/
├── app/
│   ├── admin/
│   │   └── page.tsx          # Admin Product CRUD Dashboard Page
│   ├── api/
│   │   └── [...route]/
│   │       └── route.ts      # Hono API Route mounting tRPC Server Router
│   ├── globals.css           # Neo-Brutalist Custom Stylesheet
│   ├── layout.tsx            # Global HTML Head, Fonts and Provider Shell
│   ├── page.tsx              # Interactive Storefront Catalog UI
│   └── providers.tsx         # TanStack Query Provider Wrapper
├── lib/
│   ├── redis.ts              # Resilient Redis/In-memory Database Adapter
│   └── trpc.ts               # tRPC client initializer
├── eslint.config.mjs         # ESLint Flat Config compatible with ESLint 9
├── package.json              # Script configurations & dependencies
└── tsconfig.json             # Typescript configurations
```

---

## 🚀 Getting Started

### 1. Installation
Clone the repository and install the dependencies:
```bash
git clone https://github.com/ihsannyy/e-commerce.git
cd e-commerce
npm install
```

### 2. Run the Development Server
Starts the application locally on [http://localhost:3000](http://localhost:3000):
```bash
npm run dev
```

### 3. Production Compilation & Start
Build the optimized production package:
```bash
npm run build
```
Run the compiled build:
```bash
npm run start
```

---

## 📜 License
This project is open-source. Feel free to copy, modify, or extend it for your own setups!
