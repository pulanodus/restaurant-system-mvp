# Live Dashboard - Restaurant Command Center

The Live Dashboard transforms the restaurant owner's interface into a real-time operational command center, providing immediate insight into the restaurant's current state.

## Overview

The new Live Dashboard is the default homepage (`/admin`) and serves as a real-time operational hub with live data updates every 30 seconds.

## Navigation Structure

### New Tab Order
1. **Dashboard** - Live operational command center (default/homepage)
2. **Analytics** - Historical data and performance insights
3. **Menu Management** - Menu item management
4. **Staff Management** - Staff account management
5. **QR Codes** - Table QR code generation and management
6. **Settings** - Restaurant configuration

## Live Dashboard Components

### 1. Live Activity Ticker
**Purpose**: Real-time feed of transactions as they happen
**Location**: Top of dashboard
**Features**:
- Scrolling activity feed
- Shows payments, orders, and session completions
- Real-time timestamps
- Amount displays for financial transactions

**Example Activities**:
- "Table 3 paid ₱425.00 via Orange Money"
- "Table 7 ordered 2x Cocktails"
- "Table 5 completed session"

### 2. Live Floor Plan
**Purpose**: Visual grid of all restaurant tables
**Location**: Main content area (60% width)
**Features**:
- Color-coded table status:
  - 🟢 **Green**: Available tables
  - 🟡 **Yellow**: Occupied tables
  - 🔴 **Red**: Payment pending
- Table information display:
  - Table number (T01, T02, etc.)
  - Current status
  - Order value (when occupied)
  - Number of diners
- Clickable table cards (future: link to staff session view)

### 3. Kitchen Queue Summary
**Purpose**: Real-time list of orders in the kitchen
**Location**: Right column
**Features**:
- Header: "Kitchen Now"
- Order list with status:
  - Order details (quantity × item name)
  - Table number
  - Order time
  - Status badges:
    - 🔵 **Preparing**: Orders being cooked
    - 🟡 **Ready**: Orders ready for pickup (highlighted)
- Real-time updates from order status changes

### 4. Today's Key Metrics Cards
**Purpose**: At-a-glance numbers for the current day
**Location**: Right column, below kitchen queue
**Features**:
- 2×2 grid of metric cards:
  - 💰 **Today's Sales**: Total revenue for the day
  - 👥 **Customers Served**: Number of completed sessions
  - 🍽️ **Current Covers**: Number of diners currently in restaurant
  - ⭐ **Average Rating**: Customer satisfaction rating
- Color-coded cards for easy identification
- Real-time calculations from live data

## Data Sources

### Real-Time Data
- **Tables**: Status from `tables` table
- **Sessions**: Active sessions from `sessions` table
- **Orders**: Kitchen orders from `orders` table
- **Metrics**: Calculated from session and order data

### Mock Data (Temporary)
- **Live Activity**: Sample transaction feed
- **Customer Rating**: Static 4.2 rating
- **Tips**: Placeholder tip data

## Technical Implementation

### Components
- `LiveDashboard.tsx` - Main dashboard component
- `AnalyticsPage.tsx` - Historical analytics page
- Real-time data fetching every 30 seconds
- Responsive grid layout (12-column system)

### Data Flow
1. **Fetch Tables**: Get all active tables with status
2. **Fetch Sessions**: Get active sessions for occupied tables
3. **Fetch Orders**: Get kitchen orders with status
4. **Calculate Metrics**: Process data for key metrics
5. **Update UI**: Refresh dashboard components

### Color Scheme
- **Available Tables**: `#10B981` (Green)
- **Occupied Tables**: `#F59E0B` (Yellow/Amber)
- **Payment Pending**: `#EF4444` (Red)
- **Ready Orders**: Amber highlight for attention

## Analytics Tab

The Analytics tab now focuses on historical data and deeper analysis:

### Features
- **Sales Charts**: Daily/weekly/monthly sales trends
- **Top Menu Items**: Best-selling items with revenue
- **Tip Reporting**: Tip analytics and averages
- **Period Selection**: Week/Month/Year views
- **Performance Metrics**: Historical KPIs

### Data Visualization
- Simple bar charts for sales data
- List format for top menu items
- Grid layout for tip reporting
- Metric cards for key performance indicators

## Future Enhancements

### Planned Features
1. **Table Click Navigation**: Link table cards to staff session views
2. **Real-Time Notifications**: Push notifications for important events
3. **Advanced Filtering**: Filter tables by status or section
4. **Print Queue**: Kitchen order printing integration
5. **Staff Assignment**: Assign orders to specific kitchen staff
6. **Live Chat**: Communication between front and back of house

### Data Improvements
1. **Real Activity Feed**: Replace mock data with actual transaction feed
2. **Payment Integration**: Real payment method tracking
3. **Customer Feedback**: Live rating system integration
4. **Inventory Alerts**: Low stock notifications
5. **Performance Alerts**: Slow service notifications

## Usage Instructions

### For Restaurant Owners
1. **Monitor Operations**: Use Live Dashboard for real-time restaurant oversight
2. **Table Management**: Quickly see table status and occupancy
3. **Kitchen Oversight**: Monitor order flow and preparation times
4. **Performance Tracking**: Track daily metrics and trends
5. **Historical Analysis**: Use Analytics tab for deeper insights

### For Staff
1. **Table Status**: Check table availability and current orders
2. **Kitchen Coordination**: Monitor order queue and ready items
3. **Customer Service**: Use metrics to improve service quality

## Mobile Responsiveness

The Live Dashboard is fully responsive:
- **Desktop**: Full grid layout with all widgets visible
- **Tablet**: Adjusted grid columns for optimal viewing
- **Mobile**: Stacked layout with touch-friendly interface

## Performance Considerations

- **Data Refresh**: 30-second intervals for real-time updates
- **Efficient Queries**: Optimized database queries for fast loading
- **Caching**: Client-side caching for improved performance
- **Error Handling**: Graceful fallbacks when data is unavailable

## Security

- **Authentication**: Requires admin login
- **Data Access**: Row-level security for multi-tenant data
- **API Protection**: Authenticated endpoints for sensitive data
- **Error Handling**: Secure error messages without data exposure

The Live Dashboard provides restaurant owners with the real-time operational visibility they need to run their business efficiently and provide excellent customer service.
