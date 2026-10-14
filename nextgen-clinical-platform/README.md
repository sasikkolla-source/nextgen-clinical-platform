# NextGen Clinical Platform

A simple base clinical management web app (patients, vitals, notes, medications, appointments).

## Structure
- `index.html` - page layout
- `css/styles.css` - styles (light and dark mode)
- `js/app.js` - data, vitals flag rules, views and forms

## Run
Open `index.html` in any modern browser. No build step or dependencies.

Optional local server:
    python3 -m http.server 8000
then visit http://localhost:8000

## Notes
- Data is stored in the browser's localStorage and starts with sample patients.
- To reset the demo data, clear the site's localStorage (key: `ngcp.v1`).
- Demo only. Not suitable for real patient data: a production system needs a backend,
  authentication, encryption, audit logging and HIPAA/local-law compliance.
- Vitals thresholds in `flags()` in `js/app.js` are placeholders; have a clinician set them.
