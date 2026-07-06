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
    useWeekPlan.js                  # State + logic for weekly meal plan
    useShoppingList.js              # Aggregation with category grouping + unit normalization
    useRecipes.js                   # Returns language-specific recipe array
  components/
    WeekPlanner.jsx                 # Week plan tab (day cards + meal slot dropdowns)
    ShoppingList.jsx                # Shopping tab (categorized ingredients + daily KBJU)
    RecipeList.jsx                  # Recipe browser with tag filtering
    RecipeDetail.jsx                # Single recipe view (KBJU bar, ingredients, steps)
    AboutOverlay.jsx                # About modal (bilingual content)
```

## Key Design Decisions

- **JSON data files** instead of a database: 36 recipes don't justify infrastructure. JSON is bundled at build time by Vite. Zero runtime cost.
- **Reference ingredients for shared components**: `tahini-sauce-portion` (unit: `portion`) is a marker ingredient in main-dish recipes pointing at the standalone `tahini-sauce` recipe. Marked with `shopping: false` so it doesn't clutter the shopping list; users see it in ingredient lists as a reminder to make the sauce separately.
- **Add-on recipes via tag**: Recipes tagged `add-on` (like the tahini sauce) don't map to any slot in `SLOT_TAG_MAP`, so they don't appear in week planner dropdowns but remain browsable in the Recipe list.
- **Structured ingredients** (id + amount + unit) instead of free-text strings: enables reliable shopping list aggregation across languages, no regex needed.
- **Ingredient catalog** maps IDs to localized names + categories: shopping list groups by category, ingredient names switch with language.
- **Tags as language-neutral IDs** (e.g. "lunch", "meat-free"): recipes filter correctly regardless of display language. Tag display names live in i18n.
- **react-i18next** for UI string internationalization: handles namespaces, browser language detection, localStorage persistence.
- **Recipe data duplicated per locale** (ru.json/en.json each contain both structural and text data): simpler than a base+locale split. If sync becomes painful, extract a base.json later.

## Components

- **App.jsx** (~75 lines): orchestrates tabs, language switcher, hooks
- **WeekPlanner**: 7 day cards × 4 slots, batch auto-fill, batch mismatch warnings
- **ShoppingList**: ingredients grouped by category (produce, protein, dairy, legumes, grains, pantry), unit normalization (1000g→1kg), daily KBJU summary
- **RecipeList**: tag filter pills, recipe cards with emoji/name/description/macros
- **RecipeDetail**: KBJU bar, structured ingredients, steps, tips, fresh additions

## Patterns

- Hooks for state (`useWeekPlan`) and derived data (`useShoppingList`, `useRecipes`)
- All UI strings via `t()` from react-i18next
- Ingredient/tag display via i18n keys (`t('tags.lunch')`, `t('units.g')`)
- `formatIngredient(ing, t, lang)` utility builds display strings from structured data
- Language switcher in header toggles globally, persists in localStorage
