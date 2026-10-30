---
name: g3w-admin-ui-restyle
description: 'Adapt an external g3w-admin plugin (plugins/g3w-admin-*/) to the new restyled UI (teal accent, pill buttons, card-based lists, sticky form action bar, restyled modals/file-upload, single neutral AdminLTE skin). Use when asked to "adapt a plugin to the new layout/UI/restyling", "fix plugin styling", "make plugin templates match the new g3w-admin look", "update plugin CSS for the restyling", or when a plugin page still looks like the old (pre-restyle) UI (rainbow AdminLTE boxes, plain tables, default Bootstrap modals, flat file input).'
---

# g3w-admin UI Restyle — Plugin Adaptation Guide

## Context

PR #1413 "Restyling UI" (commit `89d5a63db`, merged to `dev`) reskinned the whole admin
backend: single teal accent palette, pill-shaped buttons, card-based lists instead of
plain tables, a sticky form action bar, restyled confirmation modals, a restyled
file-upload widget, and a single neutral AdminLTE skin (no more per-role red/purple/etc.
skins). All of this lives in **one file**:
[g3w-admin/core/static/g3wadmin.css](../../../g3w-admin/core/static/g3wadmin.css)
(~32k lines — see "Reference map" below for section line numbers), plus a small JS
API in [g3w-admin/core/static/g3wadmin.js](../../../g3w-admin/core/static/g3wadmin.js).

External plugins (`plugins/g3w-admin-<name>/`) have their own templates/CSS/JS and were
**not** touched by the restyle. Most of them still look old because either (a) they
duplicate markup instead of reusing the shared includes/JS helpers, or (b) they use
custom CSS classes that don't match the new global selectors.

## Step 0 — find out what the plugin actually has

Before anything else, locate the plugin's own assets:
```
plugins/g3w-admin-<name>/<app>/templates/**/*.html
plugins/g3w-admin-<name>/<app>/static/**/*.{css,js}
```
Grep inside them for the patterns in the "Needs adaptation" checklist below.

## 1. What plugins get for FREE (no changes needed)

These are **generic selectors** in `g3wadmin.css` / helpers in `g3wadmin.js` that apply
to *any* page, including plugin pages, as long as the plugin uses standard markup/APIs:

| Feature | Requirement to get it for free | Reference |
|---|---|---|
| Teal sidebar, header, footer, single AdminLTE skin | Just extend `templates/base.html` (don't build a custom `<body>`/`<header>`) | `core/utils/general.py::get_adminlte_skin_by_user` always returns `'blue'`; CSS §"Global chrome restyle" (css:25753) |
| Pill-styled, teal-accented confirmation modals | Build modals with `ga.ui.buildDefaultModal(...)` / `buildDangerModal(...)` / `buildWarningModal(...)` (global `g3wadmin.js`), **not** hand-rolled `<div class="modal">` markup | JS: `g3wadmin.js` `ui.buildDefaultModal`/`_buildModal`; CSS §"Teal accent — Block 12: Confirmation modals" (css:31318) |
| Teal-accented `<input type="file">` / django-file-form dropzone | Use django-file-form's standard `UploadedFileField` widget (its `.dff-*` markup), ideally inside a `form` or a `.form-shell` wrapper | CSS §"Teal accent — Block 15: File upload widget" (css:31666) |
| Unified 30×30 icon-only action "chips" in any `<table class="table">` (edit/view/download green-olive, trash red) | Render row actions as `<a><i class="fa fa-pencil"></i></a>` / `<i class="ion-edit">` etc. — icon-only, no extra text, not a real `.btn` | CSS §"Unified action icon buttons inside admin tables" (css:30235) + teal override (css:30390) |
| Pill Save/Redo buttons with a sticky bottom action bar on long forms | `{% include 'core/include/form_buttons.html' %}` instead of a custom button row | Template: `core/templates/core/include/form_buttons.html` (+ `form_buttons_script.html`); CSS class `.form-buttons` (css:30997) |
| Neutralized "rainbow" AdminLTE boxes (`box-success`/`box-danger`/...) inside forms | Wrap the form body in a `<div class="form-shell">` | CSS §"Group form" → "Neutralize rainbow boxes inside the form shell" (css:26296) |

**None of this requires copying CSS into the plugin.** It is automatic once the
plugin reuses these includes/classes/JS helpers instead of inventing its own.

## 2. What needs plugin-side adaptation

These are **page-specific** restyles keyed off exact classes/IDs used only by core
templates (e.g. `.group-card`, `#layers_table`, `.users-panel`). A plugin's own list
or sub-panel will NOT get them automatically — it must either reuse the exact class
names (copy the markup pattern) or add similar scoped CSS in the plugin's own
stylesheet.

Checklist — grep the plugin for these and fix:

1. **Hardcoded AdminLTE skin names** (`skin-red`, `skin-purple`, `skin-yellow`, …) in
   plugin templates/JS/CSS — dead code now, the skin is always `blue`/teal. Remove.
2. **Custom modal markup** (`<div class="modal fade">...` built by hand in JS) instead
   of `ga.ui.buildDefaultModal/buildDangerModal/buildWarningModal` — migrate to the
   helper (see snippet below) so the teal modal styling applies automatically.
3. **Custom "Save/Cancel" button rows** — replace with
   `{% include 'core/include/form_buttons.html' %}` (requires a `save`/`redo` context
   flag, see the include's source).
4. **Plain `<table>` list views without icon-only action links** — if the plugin's
   table action cells mix icon + text or use real `.btn` elements, the auto-chip
   rule (css:30235) won't match (`:not(.btn)`); switch to icon-only `<a>`/`<button>`.
5. **Per-row expandable "sub-panel" content** (DataTables `row.child`, or an ajax-loaded
   details `<div>`) — reuse the shared sub-panel recipe (see snippet below) instead of
   plain unstyled HTML.
6. **Custom card/grid list pages** (plugin dashboard, custom object list) — if visual
   parity with the restyled lists matters, mirror the `.group-card` / `.project-card`
   patterns (see "Reference map" below) rather than inventing a new visual language.
7. **File upload fields not wrapped in `form` / `.form-shell`** — e.g. a bare `<input
   type="file">` injected via raw JS/AJAX outside any `<form>` won't match the
   `form input[type="file"]` / `form .dff-container` selectors.

## 3. Palette & shape tokens

Two palettes coexist (olive-green = original 2024 restyle "base", teal = final accent
overlay applied on top for sidebar/chips/modals/forms — use **teal** for anything new):

| Token | Hex | Use |
|---|---|---|
| Teal primary | `#149ea0` | Links, pill buttons, modal confirm button, active chips |
| Teal deep | `#0e7274` | Hover states, sidebar background, modal title text |
| Teal darkest | `#08494a` | Rarely used, deepest sidebar accent |
| Teal light bg | `#e0f5f5` / `#e3f2f3` | Chip/badge background, hover background |
| Teal border | `#c1e8e9` / `#a8d8d9` | Card/chip/input borders |
| Olive primary (legacy base) | `#95ad36` | Still used for headers, accents on many pages |
| Olive deep | `#7a8e26` / `#5d6b1c` | Headers, hover, text |
| Olive light bg | `#f3f6e3` / `#f9faf2` | Card/panel background |
| Destructive | `#c0392b` bg `#fdecea` border `#f5c6c0` | Trash/delete chips, error alerts |
| Warning | `#d97706` / `#f0ad4e` | Warning badges/modals |

Shapes: buttons/pills → `border-radius: 999px`; cards/panels → `border-radius: 12px`
with `border: 1px solid #e3e6d4` and a soft shadow
`box-shadow: 0 4px 14px -10px rgba(93,107,28,.2–.25)`; icon-only action chips →
`30×30px` (or 32/34px), `border-radius: 8px`.

## 4. Reusable snippets

**Confirmation modal (JS)** — gets the teal modal styling automatically:
```js
var modal = ga.ui.buildDefaultModal({   // or buildDangerModal / buildWarningModal
    modalTitle: 'Delete item',
    modalBody: 'Are you sure?',
    closeButton: true, closeButtonText: 'Cancel',
    confirmButton: true, confirmButtonText: 'Delete',
});
modal.setConfirmButtonAction(function () { /* ... */ });
modal.show();
```

**Form action buttons (template)**:
```django
{% include 'core/include/form_buttons.html' with save=True redo=True %}
```

**Sub-panel under an expandable table row** (mirrors `[id^="layer_widgets_"]` /
`.geoconstraints-list` / `.singlelayer-constraints-list` recipe, css:28809-29421):
```html
<div class="my-plugin-sublist">  <!-- give it its own class + matching scoped CSS -->
  <a class="btn btn-default btn-sm"><i class="fa fa-plus"></i> New …</a>
  <table class="table"> ... </table>  <!-- icon-only action links auto-chip-styled -->
</div>
```
```css
.my-plugin-sublist {
    background: #f9faf2; border: 1px solid #dde6b3; border-radius: 12px;
    padding: 14px 16px; margin-left: 40px; margin-top: 8px; margin-bottom: 8px;
    box-shadow: 0 4px 14px -10px rgba(93, 107, 28, .25);
}
```

**Intro-card teal pill action button** (`.qa-btn`, css:26679):
```html
<div class="project-shortcut-actions">
  <a class="qa-btn" href="..."><i class="fa fa-plus"></i> New thing</a>
  <a class="qa-btn qa-btn-primary" href="..."><i class="fa fa-cog"></i> Configure</a>
</div>
```

## 5. Reference map — `core/static/g3wadmin.css` sections (for copy-paste inspiration)

| Line | Section | Reusable? |
|---|---|---|
| 21656 | AdminLTE skin styles | automatic |
| 23643 | Dashboard restyle | reference only |
| 24030 | Group list restyle (`.group-card`) | copy pattern for card-grid lists |
| 24215 | Project list (group) restyle (`.project-card`, `.project-toolbar`, `.project-tabs`) | copy pattern |
| 24551 | Layers list restyle (`.layers-panel`, `table.layers-table`, `.layer-actions-grid`) | copy pattern |
| 24786 | Layer expandable widgets (DataTables `row.child`) | copy pattern (snippet above) |
| 25753 | Global chrome: header/sidebar/footer | automatic |
| 26029 | Users list (`.users-panel`, `.user-actions`, `.role-badge`, `.bool-pill`) | copy pattern for badges/pills |
| 26296 | Group form (`.form-shell`, rainbow-box neutralization) | **use `.form-shell` wrapper** |
| 26679 | Intro-card action pills (`.qa-btn`) | reusable class |
| 28809–29421 | Per-layer sub-panel widgets (widgets/qplotly/geo-constraints/column-acl/styles/scalevis lists) | copy pattern (snippet above) |
| 30235 | Unified action icon buttons inside admin tables | automatic |
| 30390 | Teal accent — sidebar + table action chips | automatic |
| 30997 | `.form-buttons` sticky form action bar | automatic via include |
| 31318 | Confirmation modals (Bootstrap) | automatic via `ga.ui.build*Modal` |
| 31666 | File upload widget (django-file-form) | automatic via standard widget |

JS helpers: `g3wadmin.js` → `ga.ui.buildDefaultModal/buildDangerModal/buildWarningModal`,
`modal.setBody/setTitle/setConfirmButtonAction/setCloseButtonAction`.

## 6. Gotchas

- Heavy use of the CSS `:has()` selector (modern Chromium/Firefox/Safari only) — fine
  for an internal admin backend, but don't rely on it in code meant to run on very old
  browsers.
- `!important` appears in several destructive/override rules (e.g. trash chip colors,
  modal buttons) — a plugin's own conflicting `!important` rule can still win if it's
  more specific or loaded later; prefer removing the plugin's own override instead of
  fighting specificity.
- `get_adminlte_skin_by_user` always returns `'blue'` now — any plugin logic that
  branches on a per-role/per-user AdminLTE skin name is dead code.
- `templates/base.html` blocks available for extension: `custom_css_links_page`,
  `body_content`, `breadcrumb`, `page_header`, `main_content`, `footer-right`,
  `custom_js_links_page`.
