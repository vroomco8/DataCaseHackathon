# 🌍 Global Philanthropy Intelligence

> An interactive dashboard for policymakers and foundation leaders to explore global development funding patterns — built on OECD disbursement data.
> [Varun Chakka, Arjun Mittal, Richard Li]


---

## Overview

**Global Philanthropy Intelligence** transforms 130,000+ OECD development finance records into a living, explorable map. Filter by sector, time period, donor country, or recipient region and every chart, stat, and country color updates instantly — letting you move from a broad overview to a precise answer in seconds.

Built with React, Mapbox GL JS, Papaparse, Recharts, and Claude API. No backend required.

---

## Project Structure

```
scaffol/
├── src/
│   ├── App.jsx          # Main dashboard — all state, filters, and layout
│   ├── App.css          # Dark theme styles
│   └── utils/
│       └── countryToIso.js  # Country name → ISO-3 mapping for map coloring
├── data/                # (gitignored) OECD CSV + GeoJSON
├── public/
├── index.html
├── vite.config.js       # Custom middleware to serve data/ directory
└── .env.example         # Token template
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Mapbox access token](https://account.mapbox.com/access-tokens/)
- A [Claude API key](https://console.anthropic.com/)

### Setup

```bash
# 1. Install dependencies
cd scaffol
npm install

# 2. Add your Mapbox token
cp .env.example .env
# Edit .env and paste your token as VITE_MAPBOX_ACCESS_TOKEN and ANTHROPIC_API_KEY

# 3. Place the data file at:
scaffol/data/OECD Dataset.xlsx - complete_p4d3_df.csv

# 4. Start the dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The dashboard will stream and parse the dataset on first load (~5–10 seconds), showing a progress bar as it goes.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite |
| Map | Mapbox GL JS 3 (choropleth via feature-state) |
| Charts | Recharts (BarChart, AreaChart, PieChart) |
| Data parsing | PapaParse (streaming CSV) |
| AI assistant | Anthropic Claude API |

---

## Features


### Guided Tour

<img width="461" height="343" alt="image" src="https://github.com/user-attachments/assets/7b640876-7a4f-4ea4-88d8-172b4dee8b91" />


On first load, a step-by-step tour walks through every section of the dashboard — the KPI cards, filter bar, map, donor/recipient panels, trend charts, and the AI assistant. Each step highlights the relevant UI area and explains what it does. The tour can be replayed at any time via the **📖 Take a Tour** button in the header.

---

### AI Dashboard Assistant

<img width="329" height="439" alt="image" src="https://github.com/user-attachments/assets/86f9c63a-73b5-4d04-a2b7-4f5a644de87e" />


A **💬 chat button** in the top-right of the header opens an AI assistant powered by Claude. Ask it anything about how to use the dashboard:

> *"How do I find the top donors in the UK?"*
> *"How do I compare funding across regions?"*
> *"What does the Donated map view show?"*

The assistant knows the full layout and filter system, and always directs you to the specific UI element that answers your question. The API key is handled server-side via a Vite proxy — it is never exposed in the browser.

---

### Interactive Choropleth Map

<img width="1316" height="651" alt="image" src="https://github.com/user-attachments/assets/84dfe134-04ea-4044-ac0c-e99ebc104021" />

The central map colors every country by the volume of philanthropy it has **received** or **donated**, on a logarithmic teal gradient. The map responds in real time to every filter you apply.


- **Received / Donated toggle** — flip the map between showing where money flows *to* vs. where it originates *from*
- **Hover tooltip** — hover any country to see its name and total funding at a glance
- **Click for Country Detail** — click any country to open a full breakdown panel (see below)

---

### Filter Bar

<img width="1296" height="37" alt="image" src="https://github.com/user-attachments/assets/13d34105-8118-4b2c-af8a-b58535c659c1" />


Five controls that filter every element of the dashboard simultaneously:

| Filter | What it does |
|---|---|
| **Year From / Year To** | Narrow the time window; data spans 2020–2023 |
| **Sector** | Isolate a single funding sector (e.g. *Emergency Response*, *General Environment Protection*, *Health*) |
| **Donor Country** | Show only grants originating from a specific country (e.g. *United Kingdom*, *United States*) |
| **Recipient Region** | Restrict to a macro-region (e.g. *Africa*, *Asia*, *Europe*) |
| **Map Shows** | Toggle the choropleth between Received and Donated views |

A **Clear Filters** button appears whenever any filter is active, resetting everything with one click.

---

### KPI Header Cards

<img width="373" height="58" alt="image" src="https://github.com/user-attachments/assets/7df394a9-d9c6-474d-a1b5-08ff43f949b8" />


Four live statistics sit in the header and update as filters change:

- **Total Funding** — sum of all disbursements in the current view (displayed in $K / $M / $B)
- **Grants** — count of individual grant transactions
- **Donors** — number of unique donor organizations
- **Countries** — number of unique recipient countries

---

### Top Donors Panel

<img width="296" height="399" alt="image" src="https://github.com/user-attachments/assets/d343879c-1069-4a27-803d-f16ee5a4560f" />

A horizontal bar chart ranking the **top 10 donor organizations** by total disbursements within the current filters. Color-coded bars make rank comparisons immediate. Pair this with the *Donor Country* filter to answer questions like:

> *"What are the top donors based out of the United Kingdom?"*
> *"How does climate funding compare to humanitarian aid?"*

---

### Sector Breakdown

<img width="300" height="432" alt="image" src="https://github.com/user-attachments/assets/1024dd33-03dd-464e-96f2-5135b8fc4ec6" />


Switch the left panel to the **Sectors** tab for a donut chart and legend showing how funding is distributed across sectors. Each wedge is labeled with its total — useful for questions like:

---

### Top Recipients Panel

A horizontal bar chart on the right showing the **top 10 recipient countries** by total funding received, colored on a teal gradient from highest to lowest. Pair with the *Sector* filter to answer:

> *"Which 5 countries receive the most funding for maternal health organizations?"*

---

### Country Detail Panel

<img width="295" height="445" alt="image" src="https://github.com/user-attachments/assets/6ae44a20-8656-4b9d-9b62-fc370b9f85fc" />

Click any country on the map to replace the Recipients panel with a deep-dive view for that country:

<img width="1242" height="662" alt="image" src="https://github.com/user-attachments/assets/78ec808f-901c-4f57-8175-33584a0619ae" />

- **Total Received** and **Total Donated** (if applicable)
- **Top 5 donor organizations** funding that country
- **Sector breakdown** — where the money goes within the country
- **Year-over-year trend sparkline** — how funding has changed over time

Click the country badge or the ✕ button to return to the global view.

---

### Funding Over Time

<img width="954" height="193" alt="image" src="https://github.com/user-attachments/assets/0e292747-fa6c-4c06-9c28-a3dc99db662e" />

An area chart at the bottom left shows **annual disbursements** across all selected filters. Watch how a single sector's funding has grown or shrunk over the years — useful for questions like:

> *"How has global funding for climate tech changed over time?"*

---

### Funding by Region

<img width="953" height="191" alt="image" src="https://github.com/user-attachments/assets/bcdfe178-d9bd-43af-a5f8-5b5d9059bdf6" />

A bar chart beside the trend view breaks total funding down by **macro-region** (Africa, Asia, Europe, etc.), showing at a glance which parts of the world attract the most philanthropic capital under the current filter set.

---

## Example Questions You Can Answer

| Question | How to explore |
|---|---|
| *"What are the top donors based out of the United Kingdom?"* | Set **Donor Country → United Kingdom**, check the Top Donors panel |
| *"Which 5 countries receive the most funding for maternal health?"* | Set **Sector → Health**, read the Top Recipients panel |
| *"How has global climate funding changed over time?"* | Set **Sector → General Environment Protection**, read the Trend chart |
| *"Which donor gives the most for infectious diseases in India?"* | Click **India** on the map, check the Country Detail panel |
| *"Which African countries receive the most emergency aid?"* | Set **Region → Africa** + **Sector → Emergency Response**, read the map |

---

## Data Source

All data comes from the **OECD Development Finance dataset** (`complete_p4d3_df.csv`), containing ~130,000 grant-level disbursement records across:

- **Years:** 2020 – 2023
- **Sectors:** Health, Education, Environment, Emergency Response, and more
- **Geographies:** 150+ recipient countries across all continents
- **Metrics:** Deflated USD disbursements and commitments

> *Some data has been cleaned to make the interface more friendly and easy to read. 
> The raw data file is excluded from this repository (see `.gitignore`). Place it at `scaffol/data/OECD Dataset.xlsx - complete_p4d3_df.csv` before running locally.
---


