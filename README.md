# Beyond the Global Average

Exploring Uneven Warming — DSC 106 Final Project.

[Interactive article](https://gladiator7767.github.io/dsc106-final-uneven-warming/)

## What to explore

Predict which latitude band warms the most, compare it with the global reference, then follow the same region across emissions scenarios, periods and climate models. The D3 charts use linked controls, direct annotations, a shared timeline scale, a scenario-gap matrix, and an exact-value CSV download. The equal-area map is a location guide, not a temperature map.

## Data and interpretation

CMIP6 near-surface air temperature (`tas`) from CanESM5, IPSL-CM6A-LR and MPI-ESM1-2-LR; one member (`r1i1p1f1`) per model. The future series cover 2015–2100 under SSP1-2.6 and SSP5-8.5. All temperature changes are relative to each model and region's own 1995–2014 average, not preindustrial temperature.

The six latitude bands include land and ocean. Regional means use grid-cell areas and annual means use month lengths. The global reference is calculated separately. Scenario gaps are paired within a model before averaging models. The selected three-model min–max range is not a confidence interval or the full CMIP6 range.

`data/provenance.json` records source versions, processing information and the annual CSV checksum. `scripts/build_data.py` is the processing recipe; it requires the packages in `requirements.txt`. A fresh run selects matching entries from the current public catalog, so compare source versions against the manifest before replacing these reviewed data.

## Local preview

Run `python -m http.server 8122` from this repository root, then open `http://localhost:8122/`. D3 and TopoJSON are bundled locally; their licenses are in `vendor/`. No build step or API token is needed.

## Files

- `index.html`, `app.js`, `style.css`: interactive article.
- `about.html`, `about.js`: sources, calculations, team and prototype progress.
- `climate-core.js`: shared calculation functions.
- `content.json`: article text with stable paragraph identifiers.
- `release.json`: website, repository and video URLs. The video entry is empty until a real recording is available; empty entries do not render a placeholder link.
- `data/`: reviewed annual series, source manifest and locator geometry.

## Team

Yifeng Zheng, Ye Teng, Edison Xu, Jinhui Qiu.

This project continues the data-processing foundation of Project 3 and develops it into a guided explorable explanation. The current site is ready for prototype feedback. Recording, feedback attendance and course submission are separate steps; a working repository is not evidence that those steps occurred.
