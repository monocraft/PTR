# Gaming Headset Release Tracker

Static GitHub-friendly gaming headset timeline and release database.

## Current schema baseline

This baseline now includes:

- **imageSourceType** on every image record
- **multiple gallery images** per headset
- **brand-by-brand official photo replacement preparation**
- compare-ready structured specs for filtering and future comparison tables

## Included brands

- Corsair
- HyperX
- Logitech
- Razer
- SteelSeries
- Turtle Beach

## JSON image model

Each product now includes:

```json
"images": {
  "imageSourceType": "generated_local_placeholder",
  "replacementStatus": "prepared_for_official_backfill",
  "primary": {
    "src": "assets/headsets/example-primary.svg",
    "alt": "Example hero image",
    "kind": "generated_local_placeholder",
    "imageSourceType": "generated_local_placeholder",
    "view": "hero",
    "sortOrder": 0,
    "isPlaceholder": true,
    "sourceUrl": "https://example.com"
  },
  "gallery": [
    {
      "src": "assets/headsets/example-gallery-1.svg",
      "alt": "Example front angle image",
      "kind": "generated_local_placeholder",
      "imageSourceType": "generated_local_placeholder",
      "view": "front",
      "sortOrder": 1,
      "isPlaceholder": true,
      "sourceUrl": "https://example.com"
    },
    {
      "src": "assets/headsets/example-gallery-2.svg",
      "alt": "Example detail image",
      "kind": "generated_local_placeholder",
      "imageSourceType": "generated_local_placeholder",
      "view": "detail",
      "sortOrder": 2,
      "isPlaceholder": true,
      "sourceUrl": "https://example.com"
    }
  ],
  "replacementTargets": {
    "brandFolder": "assets/headsets/official/{brandSlug}/{productId}/",
    "expectedPrimary": "assets/headsets/official/{brandSlug}/{productId}/primary.webp",
    "expectedGallery": [
      "assets/headsets/official/{brandSlug}/{productId}/gallery-1.webp",
      "assets/headsets/official/{brandSlug}/{productId}/gallery-2.webp",
      "assets/headsets/official/{brandSlug}/{productId}/gallery-3.webp"
    ]
  }
}
```

## Official photo replacement preparation

Each product also includes:

```json
"imageBackfill": {
  "status": "queued",
  "brand": "HyperX",
  "brandSlug": "hyperx",
  "prepared": true,
  "preferredSourceOrder": [
    "official_product_page",
    "official_press_release",
    "official_newsroom",
    "official_support_page",
    "amazon_listing"
  ],
  "requiredViews": ["hero", "front", "detail"],
  "targetFolder": "assets/headsets/official/hyperx/product-id/",
  "sourceCandidates": [{ "type": "official", "label": "Product page", "url": "https://...", "priority": 1 }],
  "notes": "Replace generated placeholders with verified official product photography brand by brand."
}
```

## Comparison schema

Records also include:

- `launch`
- `status`
- `specs`
- `compare`
- `tags`

The `compare` object is the flattened layer for future compare-table UI.

## Images in this baseline

To keep the project self-contained and GitHub Pages friendly:

- each product has a generated local **hero** image
- each product has **2 gallery images**
- all images are placeholders prepared for later official-photo replacement

This means the app works now, while also being ready for a real brand-by-brand media backfill.

## Validation

Run:

```bash
node validate-json.mjs
```

The validator checks:

- dataset structure
- required schema keys
- duplicate IDs
- presence of imageSourceType
- gallery support structure
- official-replacement prep fields
- local image existence

## Next best step

Brand by brand, replace placeholder media inside:

```text
assets/headsets/official/{brandSlug}/{productId}/
```

Recommended order:

1. Logitech
2. HyperX
3. Razer
4. Corsair
5. SteelSeries
6. Turtle Beach
