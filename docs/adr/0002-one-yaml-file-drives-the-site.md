# 2. One YAML file drives the site

**Status:** Accepted

**Context:** The site is a static GitHub Pages site. Bhagya adds shows by sending details in chat, and they get added to `contents/concerts.yml`.

**Decision:** `contents/concerts.yml` is the only source of show data. The page reads it in the browser; there is no build step and no database.

**Consequences:** A redesign changes `index.html`, `static/css` and `static/js`, not how shows are stored. New ideas that need new data (photos, tags) add optional fields to the YAML.
