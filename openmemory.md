This file is meant for tracking changes in the app. If you want to contribute, please don't forget to update and commit it.



## Overview



Weekly meal planner (React 18 + Vite) deployed on Vercel Hobby (free static). Bilingual (ru/en) with 36 recipes (35 meals + 1 add-on sauce), structured ingredient data, automated shopping list with category grouping. Nutrition (macros + curated micronutrients) is recalculated offline from USDA FoodData Central.



## Architecture



```

src/

  main.jsx                          # Entry point, initializes i18n

  App.jsx                           # Shell: header, language switcher, tab routing

  constants.js                      # DAYS, SLOTS, SLOT_TAG_MAP, formatIngredient()

  i18n/

    index.js                        # i18next config (ru default, browser lang detection)

    locales/ru/ui.json              # Russian UI strings (incl. nutrition.*)

    locales/en/ui.json              # English UI strings

  data/

    ingredients.json                # Ingredient catalog: id -> {category, ru, en, shopping?}

    unit-conversions.json           # Culinary units → g/ml (+ density, shoppingUnits, bulkByWeight, plural labels)

    tags.json                       # Tag ID -> {ru, en} display names

    nutrition/

      fdc-mapping.json              # ingredient id → USDA query / fdcId

      ingredients-usda.json         # per100g curated nutrients + raw FDC payload

    recipes/

      ru.json                       # 36 recipes (amounts in g/ml; perPortion + perPortionNutrients)

      en.json                       # 36 recipes (English text)

  hooks/

    useWeekPlan.js                  # Week plan + getDayKBJU via utils/nutrition

    useShoppingList.js              # Aggregation with category grouping + unit normalization

    useShoppingChecks.js            # Interactive checkbox state for shopping items (localStorage)

    useRecipes.js                   # Returns language-specific recipe array

  utils/

    nutrition.js                    # sumDayNutrition, knownMicros

    shoppingMeasure.js              # resolveShoppingMeasure + formatShoppingAmount (household measure first)

    generateWeekPlanPdf.js

    generateShoppingListPdf.js

    pdfFonts.js

  components/

    WeekPlanner.jsx                 # Day cards; full KBJU + collapsible micros

    ShoppingList.jsx                # Shopping + daily KBJU/micros

    RecipeList.jsx

    RecipeDetail.jsx                # Energy bar + micronutrient section

    NutrientSummary.jsx             # Collapsible micro list

    AboutOverlay.jsx

scripts/

  normalize-recipe-units.mjs        # npm run nutrition:normalize-units [-- --refresh]

  fetch-usda-nutrition.mjs          # npm run nutrition:fetch (USDA_API_KEY in .env)

  recalculate-recipe-nutrition.mjs  # npm run nutrition:recalc

```



## Key Design Decisions



- **JSON data files** instead of a database: 36 recipes don't justify infrastructure. JSON is bundled at build time by Vite. Zero runtime cost.

- **USDA offline pipeline**: fetch caches nutrients locally; the app never calls USDA at runtime. Prefer SR Legacy fdcIds; halloumi uses feta as proxy.

- **Amounts in g/ml**: recipes store metric amounts; culinary equivalents live in `note` (e.g. `≈ 1 tbsp`). Rice-cooker water scale marks stay `unit: pcs` (0 kcal).

- **Notes are the source of truth for culinary measures**: `--refresh` re-derives amount/unit from the `≈ N unit` note segment, so fixing a factor in `unit-conversions.json` propagates into recipes. Dry goods (oats, chia, cocoa) need per-ingredient spoon grams — the generic `volumeToMl` rule treats them as water and inflates weight 2–3×.

- **Shopping list shows a household measure first**: `shoppingUnits` picks the preferred unit per ingredient and the count is derived from total grams; `< 1 tbsp` falls back to tsp. Ingredients without a piece size use the number of uses across the week (`fromUses`), `bulkByWeight` items stay metric-only. Plural forms live in `measure.*_one/_few/_many/_other` keys selected via `Intl.PluralRules`.

- **Reference ingredients for shared components**: `tahini-sauce-portion` (unit: `portion`) points at `tahini-sauce`; nutrition for that line is taken from the sauce recipe’s `perPortion`.

- **Add-on recipes via tag**: Recipes tagged `add-on` don't map to any slot in `SLOT_TAG_MAP`. Nested chip under meal slots; add-on macros/micros included in daily totals.

- **Water for grains follows absorption ratios, not boiling ratios**: dishes are cooked lidded. Water is `shopping: false`.

- **Structured ingredients** (id + amount + unit) enable shopping list aggregation across languages.

- **react-i18next** for UI string internationalization.

- **Recipe data duplicated per locale** (ru.json/en.json): structural fields (amounts, perPortion*) must stay in sync.



## Components



- **App.jsx**: orchestrates tabs, language switcher, hooks

- **WeekPlanner**: 7×4 slots, batch auto-fill, add-on chips, day KBJU + micronutrient toggle

- **ShoppingList**: categorized list with household measure + metric in parentheses, checkboxes, PDF, daily energy + micros

- **RecipeList**: tag filters, kcal + protein on cards

- **RecipeDetail**: energy bar, micronutrients, ingredients, steps

- **NutrientSummary**: shared collapsible micro list

- **AboutOverlay**: bilingual about (documents USDA nutrition)



## Patterns



- Hooks for state (`useWeekPlan`) and derived data (`useShoppingList`, `useRecipes`)

- Day nutrition aggregation centralized in `src/utils/nutrition.js`

- All UI strings via `t()` from react-i18next

- `formatIngredient(ing, t, lang)` builds display strings from structured data


