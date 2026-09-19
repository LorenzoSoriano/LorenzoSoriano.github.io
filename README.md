# Lorenzo Soriano — Portfolio

Static portfolio published with GitHub Pages.

## Repository structure

```text
/
├── index.html
├── about.html
├── contact.html
├── game-design.html
├── game-development.html
├── game-production.html
├── narrative-design.html
├── thesis.html
├── project-*.html
│
└── assets/
    ├── css/
    │   ├── core/          # shared styles, typography, responsive behavior
    │   ├── components/    # reusable UI components
    │   ├── pages/         # page-specific styles
    │   └── projects/      # project-specific styles
    │
    ├── js/
    │   ├── core/          # shared runtime/UI logic
    │   ├── i18n/          # translations
    │   ├── pages/         # page-specific scripts
    │   └── projects/      # project-specific scripts and playable demos
    │
    ├── images/
    │   ├── page-backgrounds/
    │   ├── momentum-shifter/
    │   ├── gifted/
    │   ├── legend-of-the-west/
    │   ├── no-light-off/
    │   ├── remember-to-wait/
    │   ├── thesis/
    │   └── vitis/
    │
    ├── videos/
    └── documents/
```

HTML entry points remain in the repository root so existing public GitHub Pages URLs stay stable. Project code and media live under `assets/`.

## Conventions

- Shared CSS → `assets/css/core/`
- Page CSS → `assets/css/pages/<page>/`
- Project CSS → `assets/css/projects/<project>/`
- Shared JavaScript → `assets/js/core/`
- Page JavaScript → `assets/js/pages/<page>/`
- Project JavaScript → `assets/js/projects/<project>/`
- Translation files → `assets/js/i18n/`
- Project media → `assets/images/<project>/`

When moving an asset, update every `href`, `src`, dynamic loader, and CSS `url(...)` reference before publishing.
