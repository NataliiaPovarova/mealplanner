This file is meant for tracking changes in the app. If you want to contribute, please don't forget to update and commit it.



## Overview



Weekly meal planner (React 18 + Vite) deployed on Vercel Hobby (free static). Bilingual (ru/en) with 36 recipes (35 meals + 1 add-on sauce), structured ingredient data, automated shopping list with category grouping. Nutrition (macros + curated micronutrients) is recalculated offline from USDA FoodData Central.



Optional user accounts run on Firebase (Auth + Firestore, free Spark tier, no auto-pause). Signed-in users get a strictly private space: own recipes, edits and hides of the shipped ones, brand products with label nutrition, and a saved week plan. The app still works fully anonymously when Firebase env vars are absent — see [FIREBASE_SETUP.md](FIREBASE_SETUP.md).



## Architecture



```

src/

  main.jsx                          # Entry point, initializes i18n, wraps App in Auth + UserData providers

  App.jsx                           # Shell: header, language switcher, auth button, tab routing

  firebase.js                       # Modular SDK init; exports isFirebaseConfigured (null services without env vars)

  constants.js                      # DAYS, SLOTS, SLOT_TAG_MAP, formatIngredient()

  contexts/

    AuthContext.jsx                 # onAuthStateChanged, sign in/up/out, password reset

    UserDataContext.jsx             # Firestore subscriptions + mutators for users/{uid}/**

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

    useWeekPlan.js                  # Week plan + getDayKBJU; persists to Firestore (signed in) or localStorage

    useShoppingList.js              # Aggregation with category grouping + unit normalization

    useShoppingChecks.js            # Interactive checkbox state for shopping items (localStorage)

    useRecipes.js                   # Base catalog + user overlay, with nutrition recalculated where needed

  utils/

    nutrition.js                    # sumDayNutrition, knownMicros

    computeNutrition.js             # Browser port of the offline recalc; applyNutrition, computeRecipeNutrition

    userRecipes.js                  # mergeRecipeOverlay, brandOverridesFor, overlay document shapes

    userDataExport.js               # buildExport, parseImport, downloadJson

    authErrors.js                   # Firebase auth error code → i18n key

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

    AuthPanel.jsx                   # Sign in / sign up / password reset modal

    AccountPanel.jsx                # Account summary, JSON export/import, sign out

    BrandProducts.jsx               # CRUD for brand products + "my default" per ingredient

    RecipeEditor.jsx                # Create/edit/hide recipes with live nutrition preview

    ui.jsx                          # Shared Overlay, Field, Notice and button styles for the forms

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

- **User data is an overlay, never a copy of the catalog**: `users/{uid}/recipes` holds three document shapes — own recipe (`baseId: null`), edited shipped recipe (doc id === base id), and hidden shipped recipe (`deleted: true`). Fixes to the shipped catalog therefore still reach everyone, and per-user storage stays in the kilobytes. Merge lives in `utils/userRecipes.js`.

- **Overlay stores prose per language, structure once**: `text: { ru, en }` plus language-independent `ingredients`/`portions`/`tags`, preserving the ru/en structural-sync invariant. Editing in one language and viewing in the other falls back to the language that was written, because a rename should be visible everywhere.

- **Brand products attach to a canonical ingredient**, they are never new catalog entries: `{ ingredientId, brand, name, per100g }` plus `settings.ingredientDefaults` mapping ingredient → chosen product. This keeps the 59-ingredient catalog from growing, keeps shopping-list aggregation and unit conversion working, and lets one brand choice re-cost every recipe at once, shipped ones included.

- **Blank label fields fall back to USDA**: labels list macros only, so `per100gFor()` merges the user's values over the baseline instead of replacing it — otherwise picking your own yogurt would zero out every vitamin.

- **Nutrition is recalculated only where needed**: `applyNutrition()` marks a recipe dirty when it is user-created, edited, uses a branded ingredient, or borrows a portion from a dirty recipe; everything else keeps its offline-computed values untouched.

- **USDA payload stripped at build time**: the `virtual:nutrition-baseline` Vite plugin in `vite.config.js` reads `ingredients-usda.json` and emits only the `per100g` blocks, keeping the ~125k-line raw FDC payload out of the bundle without a separate generated file to keep in sync.

- **Privacy by construction**: every document lives under `users/{uid}`, so `firestore.rules` is a single rule and there is no shared writable space — three users adding three yogurts never see each other's.

- **App degrades gracefully without Firebase**: `isFirebaseConfigured` returns false when env vars are missing, services stay null, and the UI hides all account features rather than crashing.



## Components



- **App.jsx**: orchestrates tabs, language switcher, hooks

- **WeekPlanner**: 7×4 slots, batch auto-fill, add-on chips, day KBJU + micronutrient toggle

- **ShoppingList**: categorized list with household measure + metric in parentheses, checkboxes, PDF, daily energy + micros

- **RecipeList**: tag filters, kcal + protein on cards

- **RecipeDetail**: energy bar, micronutrients, ingredients, steps

- **NutrientSummary**: shared collapsible micro list

- **AboutOverlay**: bilingual about (documents USDA nutrition)

- **AuthPanel**: email/password sign in, sign up, reset; maps Firebase error codes to translated messages

- **AccountPanel**: counts of own/edited/hidden recipes and products, JSON export/import, sign out

- **BrandProducts**: per-ingredient grouping, label form (kcal/protein/fat/carbs/fiber/sugar/sodium), default toggle

- **RecipeEditor**: shared by create, edit-own and edit-base flows; live per-portion preview plus warnings for ingredients that could not be costed



## Patterns



- Hooks for state (`useWeekPlan`) and derived data (`useShoppingList`, `useRecipes`)

- Day nutrition aggregation centralized in `src/utils/nutrition.js`

- All UI strings via `t()` from react-i18next

- `formatIngredient(ing, t, lang)` builds display strings from structured data

- Contexts for remote state (`AuthContext`, `UserDataContext`); components never touch Firestore directly, they call mutators from `useUserData()`

- Firestore subscriptions are `onSnapshot`-based, so an edit in one tab updates every view without manual refetching

- `useWeekPlan` treats stored data as authoritative only at hydration, then local edits win and are written back debounced; pruning of deleted recipes waits until the overlay has loaded, and an anonymous plan is carried into a newly created account rather than overwritten


