# Gaming Headset Release Tracker

A GitHub Pages-ready static project that tracks gaming headset releases by brand and by year using a local JSON database.

## What this project does

- Shows an overall view of tracked releases
- Breaks releases down year by year
- Filters by brand, year, and keyword
- Sorts by release date, MSRP, brand, or product name
- Uses a plain JSON file as the data source
- Works as a static site with no framework or build step

## Included brands

- Logitech
- Razer
- Corsair
- SteelSeries
- Turtle Beach

## Project structure

```text
gaming-headset-release-tracker/
├─ index.html
├─ styles.css
├─ app.js
├─ .nojekyll
├─ data/
│  └─ headsets.json
└─ scripts/
   └─ validate-json.mjs
```

## Run locally

Because the app fetches a local JSON file, open it through a local server instead of double-clicking `index.html`.

### Option 1: Python
```bash
python -m http.server 8000
```

Then open:
```text
http://localhost:8000
```

### Option 2: VS Code Live Server
Open the folder and run it with Live Server.

## Deploy on GitHub Pages

1. Create a new GitHub repository.
2. Upload all files in this folder to the repository root.
3. Push to the `main` branch.
4. In GitHub:
   - go to **Settings**
   - open **Pages**
   - under **Build and deployment**, choose **Deploy from a branch**
   - select **main** and **/(root)**
5. Save.

Your site will work as a static GitHub Pages project.

## JSON schema

Each product entry follows this shape:

```json
{
  "id": "brand-model-year",
  "brand": "Logitech",
  "productName": "PRO X 2 LIGHTSPEED",
  "series": "PRO",
  "releaseDate": "2023-05-24",
  "releaseYear": 2023,
  "releaseType": "announcement",
  "priceStatus": "official_msrp",
  "msrpUSD": 249.00,
  "features": [
    "50mm graphene drivers",
    "LIGHTSPEED + Bluetooth + 3.5mm"
  ],
  "sources": [
    {
      "label": "Official announcement: PRO X 2 LIGHTSPEED",
      "type": "official"
    }
  ]
}
```

## Data note

This starter dataset is intentionally honest about source quality:

- Some brands publish announcement dates more clearly than actual shelf dates
- Some official press releases omit MSRP
- In those cases, the dataset flags the record using `releaseType` and `priceStatus`

That makes it easier to expand later without pretending every field is equally precise.

## Extend the dataset

Open:

```text
data/headsets.json
```

Add more records using the same schema. The site updates automatically.

## Validate the JSON

You can run the included validator with Node.js:

```bash
node scripts/validate-json.mjs
```

## Good next upgrades

- Add links for official product pages
- Add platform support fields
- Add driver size, wireless type, battery life, and mic type as first-class fields
- Add charts for MSRP over time
- Add a compare view
