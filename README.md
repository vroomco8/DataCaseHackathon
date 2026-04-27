# 🌍 Global Philanthropy Intelligence

> An interactive dashboard for policymakers and foundation leaders to explore global development funding patterns — built on OECD disbursement data.
> [Varun Chakka, Arjun Mittal, Richard Li]


---

## Overview

**Global Philanthropy Intelligence** transforms 130,000+ OECD development finance records into a living, explorable map. Filter by sector, time period, donor country, or recipient region and every chart, stat, and country color updates instantly — letting you move from a broad overview to a precise answer in seconds.

Built with React, Mapbox GL JS, Papaparse, and Recharts. No backend required.

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

### Setup

```bash
# 1. Install dependencies
cd scaffol
npm install

# 2. Add your Mapbox token
cp .env.example .env
# Edit .env and paste your token as VITE_MAPBOX_ACCESS_TOKEN

# 3. Place the data file at:
    scaffol/data/OECD Dataset.xlsx - complete_p4d3_df.csv

# 4. Start the dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The dashboard will stream and parse the dataset on first load (~10–15 seconds), showing a progress bar as it goes.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite |
| Map | Mapbox GL JS 3 (choropleth via feature-state) |
| Charts | Recharts (BarChart, AreaChart, PieChart) |
| Data parsing | PapaParse (streaming CSV) |

---

## Features

### Interactive Choropleth Map

The central map colors every country by the volume of philanthropy it has **received** or **donated**, on a logarithmic teal gradient. The map responds in real time to every filter you apply.


- **Received / Donated toggle** — flip the map between showing where money flows *to* vs. where it originates *from*
- **Hover tooltip** — hover any country to see its name and total funding at a glance
- **Click for Country Detail** — click any country to open a full breakdown panel (see below)

---

### Filter Bar


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

Four live statistics sit in the header and update as filters change:

- **Total Funding** — sum of all disbursements in the current view (displayed in $K / $M / $B)
- **Grants** — count of individual grant transactions
- **Donors** — number of unique donor organizations
- **Countries** — number of unique recipient countries

---

### Top Donors Panel

A horizontal bar chart ranking the **top 10 donor organizations** by total disbursements within the current filters. Color-coded bars make rank comparisons immediate. Pair this with the *Donor Country* filter to answer questions like:

> *"What are the top donors based out of the United Kingdom?"*
> *"How does climate funding compare to humanitarian aid?"*

---

### Sector Breakdown

Switch the left panel to the **Sectors** tab for a donut chart and legend showing how funding is distributed across sectors. Each wedge is labeled with its total — useful for questions like:


---

### Top Recipients Panel

A horizontal bar chart on the right showing the **top 10 recipient countries** by total funding received, colored on a teal gradient from highest to lowest. Pair with the *Sector* filter to answer:

> *"Which 5 countries receive the most funding for maternal health organizations?"*

---

### Country Detail Panel

Click any country on the map to replace the Recipients panel with a deep-dive view for that country:

- **Total Received** and **Total Donated** (if applicable)
- **Top 5 donor organizations** funding that country
- **Sector breakdown** — where the money goes within the country
- **Year-over-year trend sparkline** — how funding has changed over time

Click the country badge or the ✕ button to return to the global view.

---

### Funding Over Time


An area chart at the bottom left shows **annual disbursements** across all selected filters. Watch how a single sector's funding has grown or shrunk over the years — useful for questions like:

> *"How has global funding for climate tech changed over time?"*

---

### Funding by Region


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


