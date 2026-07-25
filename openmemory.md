>This file is meant for tracking changes in the app. If you want to contribute, please don't forget to update and commit it.

## Overview

Weekly meal planner (React 18 + Vite) deployed on Vercel Hobby (free static). Bilingual (ru/en) with 36 recipes (35 meals + 1 add-on sauce), structured ingredient data, automated shopping list with category grouping.

## Architecture

```
src/
  main.jsx                          # Entry point, initializes i18n
  App.jsx                           # Shell: header, language switcher, tab routing
  constants.js                      # DAYS, SLOTS, SLOT_TAG_MAP, formatIngredient()
  i18n/
    index.js                        # i18next config (ru default, browser lang detection)
    locales/ru/ui.json              # ~100 Russian UI strings
    locales/en/ui.json              # ~100 English UI strings
  data/
    ingredients.json                # Ingredient catalog: id -> {category, ru, en, shopping?}
    tags.json                       # Tag ID -> {ru, en} display names
    recipes/
      ru.json                       # 36 recipes in Russian (35 meals + 1 add-on sauce)
      en.json                       # 36 recipes in English (35 meals + 1 add-on sauce)
  hooks/
    useWeekPlan.js                  # State + logic for weekly meal plan (main meals + parallel weekAddOns map)
    useShoppingList.js              # Aggregation (main meals + add-ons) with category grouping + unit normalization
    useShoppingChecks.js          # Interactive checkbox state for shopping items (localStorage)
    useRecipes.js                   # Returns language-specific recipe array
  components/
    WeekPlanner.jsx                 # Week plan tab (day cards + meal slot dropdowns)
    ShoppingList.jsx                # Shopping tab (categorized ingredients, checkboxes, PDF export, daily energy value)
    RecipeList.jsx                  # Recipe browser with tag filtering
    RecipeDetail.jsx                # Single recipe view (energy value bar, ingredients, steps)
    AboutOverlay.jsx                # About modal (bilingual content)
```

## Key Design Decisions

- **JSON data files** instead of a database: 36 recipes don't justify infrastructure. JSON is bundled at build time by Vite. Zero runtime cost.
- **Reference ingredients for shared components**: `tahini-sauce-portion` (unit: `portion`) is a marker ingredient in main-dish recipes pointing at the standalone `tahini-sauce` recipe. Marked with `shopping: false` so it doesn't clutter the shopping list; users see it in ingredient lists as a reminder to make the sauce separately.
- **Add-on recipes via tag**: Recipes tagged `add-on` (like the tahini sauce) don't map to any slot in `SLOT_TAG_MAP` (constant `ADDON_TAG` in `constants.js`). They aren't listed among main-meal options, but each occupied meal slot in the week planner shows a nested chip below allowing the user to attach an add-on. Add-on ingredients are aggregated into the shopping list (via parallel `weekAddOns` state in `useWeekPlan`, passed to `useShoppingList`) and their energy value is included in the per-day totals. Add-on recipes are also emitted in the PDF plan (inside the day cell) and in the PDF recipes section.
- **Water for grains follows absorption ratios, not boiling ratios**: dishes are cooked lidded (rice cooker or covered bowl), so there is almost no evaporation. Buckwheat and quinoa use 2 ml water per 1 g dry grain, couscous 1.4 ml per 1 g (≈ equal volumes), red lentils 3 ml per 1 g (they break down into a porridge, so they take more). Rice recipes intentionally reference the rice cooker's 东北米 scale marks instead of millilitres, and the noodle broth bowl's 800 ml is stock, not cooking water. Water is `shopping: false`, so these amounts never reach the shopping list.
- **Structured ingredients** (id + amount + unit) instead of free-text strings: enables reliable shopping list aggregation across languages, no regex needed.
- **Ingredient catalog** maps IDs to localized names + categories: shopping list groups by category, ingredient names switch with language.
- **Tags as language-neutral IDs** (e.g. "lunch", "meat-free"): recipes filter correctly regardless of display language. Tag display names live in i18n.
- **react-i18next** for UI string internationalization: handles namespaces, browser language detection, localStorage persistence.
- **Recipe data duplicated per locale** (ru.json/en.json each contain both structural and text data): simpler than a base+locale split. If sync becomes painful, extract a base.json later.

## Components

- **App.jsx** (~75 lines): orchestrates tabs, language switcher, hooks
- **WeekPlanner**: 7 day cards × 4 slots, batch auto-fill, batch mismatch warnings, optional nested add-on chip below each occupied slot
- **ShoppingList**: ingredients grouped by category (produce, protein, dairy, legumes, grains, pantry), unit normalization (1000g→1kg), interactive checkboxes (persisted in localStorage), independent PDF export, daily energy value summary
- **RecipeList**: tag filter pills, recipe cards with emoji/name/description/macros
- **RecipeDetail**: energy value bar, structured ingredients, steps, tips, fresh additions

## Patterns

- Hooks for state (`useWeekPlan`) and derived data (`useShoppingList`, `useRecipes`)
- All UI strings via `t()` from react-i18next
- Ingredient/tag display via i18n keys (`t('tags.lunch')`, `t('units.g')`)
- `formatIngredient(ing, t, lang)` utility builds display strings from structured data
- Language switcher in header toggles globally, persists in localStorage
