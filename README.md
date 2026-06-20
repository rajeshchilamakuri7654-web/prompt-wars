# Aetheria Carbon: Carbon Footprint Awareness Platform

Aetheria Carbon is an enterprise-grade, full-stack, real-time Carbon Footprint Awareness Platform. It combines a strict TypeScript Node.js/Express calculation backend with a Next.js frontend, featuring a weightless, premium dark-theme glassmorphism dashboard and an interactive Three.js 3D WebGL particle footprint visualization.

## Architecture Overview

```
                          +------------------------------+
                          |      Browser Client (UI)     |
                          |  Next.js (React/TS), Three.js |
                          +--------------+---------------+
                                         |
                       (Real-time WebSockets / REST HTTP Fallback)
                                         |
                                         v
                          +--------------+---------------+
                          |    Express Server (Node.js)  |
                          |  TypeScript, Helmet, Zod     |
                          +--------------+---------------+
                                         |
                                         v
                          +--------------+---------------+
                          |   Carbon Calculation Engine  |
                          |   Habits Simulation Math     |
                          +------------------------------+
```

---

## Core Math & Calculation Formulas

All emissions are calculated and returned in **kg of CO2 equivalent per year (kg/year)**.

### 1. Transport Emissions
*   **Commute Emissions**: Computed based on daily distance $d$ (in km) scaled to annual distance ($d \times 365$) and commute mode factors:
    $$\text{Commute Emission} = d \times 365 \times \text{Factor}_{\text{mode}}$$
    *   `Gas Car`: $0.18$ kg CO2/km
    *   `Electric Vehicle (EV)`: $0.05$ kg CO2/km (accounting for electrical grid lifecycle)
    *   `Public Transit`: $0.04$ kg CO2/km
    *   `Bicycle / Walk`: $0.00$ kg CO2/km
*   **Aviation Emissions**:
    $$\text{Aviation Emission} = (\text{Short-Haul Count} \times 150) + (\text{Long-Haul Count} \times 900)$$
    *   `Short-Haul (< 3 hours)`: $150$ kg CO2 per flight
    *   `Long-Haul (> 3 hours)`: $900$ kg CO2 per flight

### 2. Dietary Emissions
Annual dietary carbon factors are assigned directly based on nutritional profiles:
*   `Vegan`: $600$ kg CO2/year
*   `Vegetarian`: $900$ kg CO2/year
*   `Flexitarian` (occasional meat): $1,400$ kg CO2/year
*   `Average Meat` (moderate meat): $2,000$ kg CO2/year
*   `Heavy Meat` (daily meat): $2,800$ kg CO2/year

### 3. Home Energy Emissions
Energy consumption is estimated based on housing type and adjusted by the household power source factor.
*   **Baseline Annual Usage**:
    *   `Apartment`: $1,500$ kWh electricity, $2,000$ kWh heating
    *   `Semi-detached`: $3,000$ kWh electricity, $4,000$ kWh heating
    *   `Detached`: $5,000$ kWh electricity, $7,000$ kWh heating
*   **Emission Factors**:
    *   **Electricity**:
        *   `Utility Grid`: $0.40$ kg CO2/kWh
        *   `Solar / Renewable`: $0.05$ kg CO2/kWh
    *   **Heating**:
        *   `Standard Grid/Gas Heating`: $0.20$ kg CO2/kWh
        *   `Solar / Renewable Offset (Heat Pump)`: $0.10$ kg CO2/kWh (50% reduction)
*   **Formula**:
    $$\text{Energy Emission} = (\text{Electricity Usage} \times \text{Factor}_{\text{power}}) + (\text{Heating Usage} \times \text{Factor}_{\text{heating}})$$

---

## Security Integration (OWASP Top 10)

1.  **Secure HTTP Headers**: Implemented via `helmet` in the Express server to prevent clickjacking, MIME sniffing, and cross-site scripting (XSS).
2.  **Input Sanitization & Schema Validation**: Handled on all API routes and WebSocket connections using `Zod` schemas. Payloads exceeding 10KB are automatically blocked to prevent memory exhaustion and buffer overflows.
3.  **Strict CORS**: Cross-Origin Resource Sharing is configured to allow only trusted origins (e.g. localhost:3000) and drop unauthorized cross-site requests.
4.  **Rate Limiting**:
    *   **HTTP**: Max 100 requests per 15-minute window per IP.
    *   **WebSockets**: Max 120 messages per 1-minute window per IP (prevents DOS on rapid slider drags).

---

## Accessibility (a11y) Strategy (WCAG 2.1 AAA)

1.  **Semantic HTML**: Proper HTML5 tags (`<main>`, `<header>`, `<section>`, `<article>`) organize page structures.
2.  **Focus States**: Bright, high-contrast cyan focus indicators (`outline`) are enforced for keyboard-only web navigators.
3.  **ARIA Roles**: All custom controls (like the circular Diet Dial or Commute segments) implement accessibility landmarks (`role="slider"`, `role="switch"`, `role="radiogroup"`, `aria-valuenow`, `aria-valuetext`).
4.  **Keyboard Navigability**:
    *   Custom Diet Dial is fully operable using Left/Down arrow keys (reduce meat) and Right/Up arrow keys (increase meat).
    *   Sliders are native and fully compatible with tab indexes and arrows.

---

## Setup & Running Instructions

Ensure Node.js (v20+ recommended) is installed on your machine.

### Method A: Running via Docker Compose (Recommended)
This launches both the client and API server together in separate, sandboxed containers.

1.  From the project root directory, run:
    ```bash
    docker compose up --build
    ```
2.  Open your browser and navigate to:
    *   Frontend: [http://localhost:3000](http://localhost:3000)
    *   Backend Healthcheck: [http://localhost:5000/health](http://localhost:5000/health)

### Method B: Running Locally for Development

#### 1. Setup Backend
1.  Navigate to the backend folder:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the dev server:
    ```bash
    npm run dev
    ```

#### 2. Setup Frontend
1.  Navigate to the frontend folder (in a separate terminal):
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the Next.js dev server:
    ```bash
    npm run dev
    ```
4.  Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Running Test Suites

### Backend Unit Tests (Jest)
Runs calculation engine math verification:
```bash
cd backend
npm run test
```

### Frontend UI Tests (Jest + React Testing Library)
Runs accessibility rendering and interactive tests:
```bash
cd frontend
npm run test
```
