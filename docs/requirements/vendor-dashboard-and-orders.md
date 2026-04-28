# Vendor Dashboard & Orders – Requirements Document

> **Purpose:** Central requirements file for the PocketShop vendor portal. Complete items in flow order; many depend on vendor settings.

---

## Flow Overview

1. **Vendor Settings** – Base configuration (item preparation time, stock types, low-stock thresholds) must be in place first
2. **Inventory & Stock** – Stock types, availability modes, low stock alerts, daily reset
3. **Dashboard** – Draggable cards, charts, filters, quick actions, Top Products, Recent Orders
4. **Order Management (Kanban)** – Timeline, timers, acceptance, preparation, View popup, COD handling
5. **Order History** – Time filters, export to Excel

---

## 1. Dashboard

### 1.1 Draggable Info Cards
- Info cards at the top should be **draggable** so vendors can arrange by priority (e.g. revenue first vs order history first)
- Vendors can choose which metrics they need most at the top
- All 4 cards are draggable: Total Revenue, Total Orders, Avg Order Value, Stock Status

### 1.2 Total Revenue Card
- Add **filters**: Month / Week / Day (not just "vs last week" or lifetime)
- Current "vs last week" comparison is not useful
- Card should support the same filtering as other revenue views

### 1.3 Sales Overview Chart
- Current: 7 days only
- **Add options**: 7 days, Monthly, Lifetime
- Allow vendor to switch between these time ranges

### 1.4 Order Status Section
- **Add filters**: Weekly, Daily, Monthly
- Support all status types:
  - Completed
  - Unable to deliver
  - Cancelled by user
  - Cancelled by vendor (different color)
  - System failure (if applicable)
- **Timeline behaviour:**
  - Order placed → visible for 5 minutes for vendor to accept
  - If not accepted within 5 minutes → mark as **Unable to deliver**
  - User cancels → **Cancelled by user**
  - Vendor cancels → **Cancelled by vendor** (distinct color)
  - After 5 minutes, order should not stay on display indefinitely

### 1.5 Quick Actions
- Quick actions are important on the dashboard
- Plan to add more actions
- Keep this section prominent

### 1.6 Top Products Section
- **Remove** "View All" button (not working)
- **Add** popup with circular/pie chart showing top 5 items + "Rest" as 6th slice
- **UI improvements:**
  - #1, #2 style numbering does not look good – redesign
  - "5 sold" (and similar) should be **highlighted**
  - Categories shown on the right – keep or adjust layout
- Data: Top 5 items by performance

### 1.7 Top Categories Section
- Similar to Top Products
- **Add** pie chart: 3 categories + 1 "Rest" slice (3+1 structure)
- Replace or remove non-working "View All" button

### 1.8 Recent Orders Section
- Current layout and green/red status styling are good
- **Fix:** Clicking an order should open a **quick view popup** with main info (not full details)
- Quick view should have a "View more info" option that redirects to the Order History section (Orders tab)

---

## 2. Low Stock Alerts

### 2.1 Two Availability Modes
When adding/editing an item, vendor chooses:

**Option 1: Quantity-based availability**
- For items like plates of samosas with a fixed daily quantity (e.g. 100 per day)
- Vendor sets daily quantity (e.g. 100)
- Vendor sets low-stock threshold (e.g. 10)
- When quantity goes below threshold → alert
- Use case: Prepared food, finite daily capacity

**Option 2: Requirement-based availability**
- For items that cannot be measured in plates (e.g. Thali)
- Vendor uses a toggle to mark item as "in stock" or "out of stock"
- No quantity tracking
- Use case: Custom/composite items, non-discrete quantities

### 2.2 Stock Reset
- **Daily reset** for quantity-based items (e.g. daily quantity resets each day)
- Currently not resetting – fix this
- May need vendor settings for reset time (e.g. midnight)

### 2.3 Bug-free Alerts
- Ensure low stock alerts work correctly for both availability modes
- Notifications when threshold is reached
- Clear UI for Edit Stock / Restock actions

---

## 3. Order Section (Order Management)

### 3.1 Info Cards (Top of Order Management)
- **Active Orders:** Show current active orders with **no filter** – correct as is
- **Total Orders:** Primarily show **today’s orders** (not lifetime by default)
- **Total Revenue:** Same – focus on **today**
- **Completion Rate:** No weekly/monthly filter needed; show overall completion rate

### 3.2 Kanban Flow – Core Behaviour

**Columns:** New Orders → In Progress → Ready → (Completed/Cancelled off-board)

**Rules:**
- Once order is dragged from **New/Accepted** → **In Progress**, it **cannot** be dragged back
- Same logic for In Progress → Ready
- Newest orders appear at **top** (oldest at top = priority/FIFO)

**View Button:**
- Currently not working
- Should open a **popup or overlay** with order info
- Same behaviour for New Orders, In Progress, Ready, and other statuses

### 3.3 Acceptance & Timer
- **5-minute timer** starts when customer places order
- Vendor must accept within 5 minutes
- If not accepted → mark as **Unable to deliver**
- On accept: record acceptance time and move to In Progress

### 3.4 Preparation Time
- **Preparation time per item** – vendor sets this when adding items (vendor settings / inventory)
- When order moves to In Progress, start preparation timer
- If not prepared within preparation time → show popup/message: "Order is running late"
- When order is marked Ready → record preparation time
- Timer stops only when order is marked **Completed** (or cancelled)

### 3.5 COD (Cash on Delivery)
- When marking a **COD** order as Complete → show **popup**: "Has payment been received?"
- Do **not** mark as Complete for unpaid orders
- Force confirmation before completion

### 3.6 Overdue Orders
- If order is accepted but not prepared within **2× preparation time** → mark as overdue and **highlight** it
- Visual distinction (e.g. red/orange border or badge)
- Alert vendor that order is late

---

## 4. Order History

- **Time filters:**
  - Week-wise
  - Last 15 days
  - 1 month
- **Banking-style** view (statement-like: last 15 days, 1 month)
- **Export to Excel** – button to download order history

---

## 5. Dependency Flow (Implementation Order)

| # | Area              | Requirement                         | Depends On      | Status |
|---|-------------------|-------------------------------------|-----------------|--------|
| 1 | Vendor Settings   | Item preparation time per product   | —               | ✅ Done |
| 2 | Vendor Settings   | Availability mode (quantity vs toggle) | —            | ✅ Done |
| 3 | Inventory         | Low stock threshold, daily quantity | #1, #2          | ✅ Done |
| 4 | Inventory         | Daily stock reset                   | #3              | ✅ Done |
| 5 | Orders            | 5-min acceptance timer, auto-unable | —               | ✅ Done |
| 5a| Orders            | Visible countdown in Order Info (Kanban + panel) | #5 | ✅ Done |
| 5b| Customer          | Order tracking page with status + 5-min timer    | #5 | ✅ Done |
| 6 | Orders            | View button → order popup/overlay   | —               | ✅ Done |
| 7 | Orders            | Preparation time per order          | #1              | ✅ Done |
| 8 | Orders            | COD completion confirmation popup   | —               | ✅ Done |
| 9 | Orders            | Kanban drag rules, overdue highlight| #7              | ✅ Done |
| 10| Dashboard         | Draggable info cards                | —               | ✅ Done |
| 11| Dashboard         | Revenue/Orders filters (day/week/month) | —           | ✅ Done |
| 12| Dashboard         | Sales chart (7d, monthly, lifetime) | —               | ✅ Done |
| 13| Dashboard         | Order status filters & types        | #5              | ✅ Done |
| 14| Dashboard         | Top Products pie chart (5+Rest)     | —               | ✅ Done |
| 15| Dashboard         | Top Categories pie chart (3+Rest)   | —               | ✅ Done |
| 16| Dashboard         | Recent Orders quick view + "View more" | #6           | ✅ Done |
| 17| Order History     | Time filters (week, 15d, 1m)        | —               | ✅ Done |
| 18| Order History     | Export to Excel                     | —               | ✅ Done |

---

## 6. Open / Later Items

- Stock daily reset behaviour – user will review later
- Other edge cases (e.g. system failure, partial cancellations) – to be defined

---

## 7. Completed Items Log

| # | Completed | Notes |
|---|-----------|-------|
| 1 | ✅ | Added `preparation_time_minutes` (1–120) to products. Migration: `docs/reports/sql/add_preparation_time_migration.sql`. |
| 2 | ✅ | Added `availability_mode` (quantity \| requirement) and `daily_quantity`. Migration: `docs/reports/sql/add_availability_mode_migration.sql`. Quantity = track stock + daily reset; Requirement = in/out toggle. **Run migration before use.** |
| 6 | ✅ | View button opens slide-over panel (portal to body). Added dark mode, backdrop blur, z-index fix. "View more in Order History" scrolls to Order History section. |
| 10 | ✅ | Draggable metric cards (Total Revenue, Total Orders, Avg Order Value, Stock Status). Drag handle on hover; order persisted per vendor in localStorage. Uses @dnd-kit. Equal card sizing (min-h, h-full). |
| 11 | ✅ | Revenue/Orders filters: Day, Week, Month. Total Revenue, Total Orders, Avg Order Value respect filter. Comparison labels: vs yesterday / vs last week / vs last month. |
| 12 | ✅ | Sales Overview chart: 7 Days, Monthly (12 months), Lifetime. Toggle in chart header; useAnalytics fetches 365 days; salesByMonth aggregation added. |
| 13 | ✅ | Order Status section: Daily, Weekly, Monthly filters. Status types with distinct colors (Completed, Pending, Processing, Ready, Unable to deliver). Compact toggle styling (h-7, text-xs). |
| 14 | ✅ | Top Products: Removed View All. Added popup with pie chart (top 5 + Rest). Redesigned list: colored dot, highlighted "X sold", category on right. |
| 15 | ✅ | Top Categories: New card with top 3 + Rest pie chart popup. Revenue by category; View chart button. Replaced non-working View All. |
| 16 | ✅ | Recent Orders: Click opens quick view popup (order #, status, customer, date, total, items). "View more in Order History" navigates to Orders + scrolls. |
| 17 | ✅ | Order History: Time filters Week, 15 days, 1 month. Compact toggle. |
| 18 | ✅ | Order History: Export to CSV (Excel-compatible). |
| 8 | ✅ | COD: When completing Cash order, AlertDialog "Has payment been received?" – must confirm before marking Complete. |
| 9 | ✅ | Kanban: Drag rules – no backward drag (IN_PROGRESS→NEW, READY→IN_PROGRESS). OrderCard `isOverdue` prop. |
| 3 | ✅ | Low stock: Only for quantity-based products. Inventory, Dashboard, ProductCard updated. |
| 4 | ✅ | Daily stock reset: "Reset daily stock" button on Inventory; sets stock_quantity = daily_quantity for quantity-based products. |
| 7 | ✅ | Preparation time: Computed from product preparation_time_minutes. Shown in OrderDetailPanel. Overdue highlight when >2× prep time in IN_PROGRESS. |
| 5 | ✅ | 5-min acceptance timer: pg_cron job runs every minute; auto-updates pending orders older than 5 min to cancelled. Migration: `docs/reports/sql/add_5min_acceptance_timer_migration.sql`. **Run migration in Supabase SQL Editor.** |
| 5a | ✅ | Visible 5-min countdown: AcceptanceCountdown component in OrderCard (compact) and OrderDetailPanel (full) for NEW orders. Shows "Accept within X:XX" or "Time expired". |
| 5b | ✅ | Customer Order Tracking: Full OrderTracking page fetches order, shows OrderStatusTracker, 5-min acceptance timer for pending, realtime updates, "Track Order Status" on OrderConfirmation. |

---

*Last updated: Mar 2026*
