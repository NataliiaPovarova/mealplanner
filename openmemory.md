This file is meant for tracking changes in the app. If you want to contribute, please don't forget to update and commit it.



## Overview



Weekly meal planner (React 18 + Vite) deployed on Vercel Hobby (free static). Bilingual (ru/en) with 36 recipes (35 meals + 1 add-on sauce), structured ingredient data, automated shopping list with category grouping. Nutrition (macros + curated micronutrients) is recalculated offline from USDA FoodData Central.



A meal slot holds any number of dishes, and a dish is either a recipe or a single product with an amount, with add-ons (berries, honey, sauces…) attached to the individual dish. Filtering runs on one grouped tag vocabulary shared by recipes and products; meal times are not part of it — users tag their own breakfasts and dinners.



Optional user accounts run on Firebase (Auth + Firestore, free Spark tier, no auto-pause). Signed-in users get a strictly private space: own recipes, edits and hides of the shipped ones, brand products with label nutrition, and a saved week plan. The app still works fully anonymously when Firebase env vars are absent — see [FIREBASE_SETUP.md](FIREBASE_SETUP.md).



## Architecture



```

src/

  main.jsx                          # Entry point, initializes i18n, wraps App in Auth + UserData providers

  App.jsx                           # Shell: header, language switcher, auth button, tab routing

  firebase.js                       # Modular SDK init; exports isFirebaseConfigured (null services without env vars)

  constants.js                      # DAYS, SLOTS, TAG_GROUPS, tagCatalog + groupTags(), ingredientCatalog, formatIngredient()

  contexts/

    AuthContext.jsx                 # onAuthStateChanged, sign in/up/out, password reset

    UserDataContext.jsx             # Firestore subscriptions + mutators for users/{uid}/**

  i18n/

    index.js                        # i18next config (ru default, browser lang detection)

    locales/ru/ui.json              # Russian UI strings (incl. nutrition.*)

    locales/en/ui.json              # English UI strings

  data/

    ingredients.json                # Ingredient catalog: id -> {category, tags, roles, portion, ru, en, shopping?}

    unit-conversions.json           # Culinary units → g/ml (+ density, shoppingUnits, bulkByWeight, plural labels)

    tags.json                       # Tag vocabulary: tag ID -> {group} (food | form | effort | diet); labels in i18n tags.*

    nutrition/

      fdc-mapping.json              # ingredient id → USDA query / fdcId

      ingredients-usda.json         # per100g curated nutrients + raw FDC payload

    recipes/

      ru.json                       # 36 recipes (amounts in g/ml; perPortion + perPortionNutrients)

      en.json                       # 36 recipes (English text)

  hooks/

    useWeekPlan.js                  # Week plan v2 (dishes + nested add-ons) + getDayKBJU; Firestore (signed in) or localStorage

    useDishTags.js                  # Personal tags: definitions + per-dish assignments; settings.dishTags or localStorage
    useTourState.js                 # Which onboarding tours were seen; localStorage ∪ settings.tour

    useShoppingList.js              # Aggregation with category grouping + unit normalization

    useShoppingChecks.js            # Interactive checkbox state for shopping items (localStorage)

    useRecipes.js                   # Base catalog + user overlay, with nutrition recalculated where needed

  utils/

    nutrition.js                    # MACRO_KEYS/MICRO_KEYS, day-total helpers, knownMicros

    planEntries.js                  # Plan v2 shape: migration, entry nutrition/labels, default portions, household hints, sumDayNutrition

    computeNutrition.js             # Browser port of the offline recalc; applyNutrition, computeRecipeNutrition

    userRecipes.js                  # mergeRecipeOverlay, brandOverridesFor, overlay document shapes

    userDataExport.js               # buildExport, parseImport, downloadJson

    authErrors.js                   # Firebase auth error code → i18n key

    shoppingMeasure.js              # resolveShoppingMeasure + formatShoppingAmount (household measure first)

    generateWeekPlanPdf.js

    generateShoppingListPdf.js

    pdfFonts.js

  components/

    WeekPlanner.jsx                 # Day cards; dishes with nested add-ons, inline amounts, KBJU + collapsible micros

    DishPicker.jsx                  # Overlay: recipes/products switch, grouped filters, amount with household hint

    TagFilterBar.jsx                # Shared grouped tag chips (recipes tab, picker, editor)

    DishTagChips.jsx                # Toggle/create/delete personal tags on a dish

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

  tour/

    steps.js                        # Four tours (week / shopping / recipes / account) as anchor + placement + exit; TAB_TOURS

    TourContext.jsx                 # One tour at a time: request queue, anchor polling, auto-skip of missing steps

    TourBubble.jsx                  # The bubble itself: placement, highlight ring, counter, skip / next

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

- **A slot holds a list of dishes, and add-ons hang off a dish, not off the slot** (plan v2, `utils/planEntries.js`): `weekPlan[cellKey] = [{ key, kind, id, amount?, unit?, addOns: [...] }]`. The old model — one recipe id per slot plus a parallel `weekAddOns` map — could not express "porridge + a boiled egg, honey on the porridge only". Everything that reads the plan (day KBJU, shopping list, PDF, planned count) goes through `forEachPlanEntry`/`entryNutrition`, so there is a single place to teach about new entry kinds.

- **Plan migration is tolerant, not versioned-strict**: `normalizeWeekPlan` accepts v2 arrays, the legacy `{weekPlan, weekAddOns}` pair, and a bare `cellKey → recipeId` map, because the same shapes live in three places written at different times (localStorage, Firestore, exported JSON files users keep on disk). A string value is the migration trigger, so no stored version field has to be trusted.

- **A dish is a recipe or a plain product**: ingredients carry `roles` (`dish` / `addon`) and `portion` defaults, so cottage cheese can be planned on its own with berries, nuts and honey on top instead of forcing a recipe for every combination. Big macro sources (grains, eggs, meat, fish, pasta, seafood) get `dish`; accents (veg, fruit, berries, greens, sauces, honey, cheese, oils, bread, cocoa, chia, nut butter, lemon juice) get `addon`; many get both.

- **Amounts are metric with a household hint, not household units**: an ingredient entry stores `amount` + `unit` in g/ml (a real, recalculable number), and `householdHint()` derives `≈ 1.5 tsp` for display from `unit-conversions.json`. Editing the amount recalculates nutrition and the shopping list live; storing "1 handful" would have made both impossible.

- **Add-on recipes via tag**: recipes tagged `add-on` (sauces) are offered in the add-on picker instead of the dish list. Add-on macros/micros are included in daily totals.

- **One grouped tag vocabulary for recipes and ingredients, with no meal times in it**: `tags.json` maps a tag to a group — `food` (what's in it), `form` (what it is), `effort` (how it's cooked), `diet` (accents) — and the same ids describe both recipes and products, so a single filter bar can offer "grain" and get both buckwheat and a buckwheat bowl. Meal-time tags were removed outright: `SLOT_TAG_MAP` used them to decide what a slot could hold, which quietly imposed one person's idea of lunch on everyone. The point of tags is to avoid scrolling, so groups stay coarse (the picker shows `custom`+`food`+`form` first and expands on demand) and near-duplicates were retired (`no-reheating` folded into `cold-bowl`).

- **Tag labels live in i18n, not in the data file**: `tags.json` holds vocabulary and grouping only. A tag is a UI string like any other, and keeping ru/en in the JSON meant two files to edit for one rename.

- **Personal tags sit beside the catalog, never inside a recipe**: `useDishTags` stores `{ tags, assignments: { "recipe:<id>" | "ingredient:<id>" → [tagId] } }` in `settings.dishTags` (or localStorage). Writing a tag into a recipe override would create an "edited shipped recipe" document and mark it dirty for `needsNutritionRecompute` — a full nutrition recalculation because someone labelled a dish "breakfast". Ids are `my:`-prefixed so they can never collide with the vocabulary, and breakfast/lunch/dinner/snack are seeded so the feature is useful before the user configures anything.

- **The seeded tags are a starting point, not a vocabulary**: `builtin` means only "label comes from i18n", so all four can be renamed and deleted like any other tag. Renaming clears the marker and stores the typed label, because a name the user chose must survive a language switch instead of reverting to the translation. Assignments key on the tag id, so a rename touches nothing else, and an explicitly emptied tag list stays empty instead of being re-seeded on the next load.

- **The picker remembers the filter per slot and role** (`dish-filter:<role>:<slot>` in localStorage) instead of asking the user to pin a tag to a slot. Same effect as the removed `SLOT_TAG_MAP` — opening breakfast shows breakfast-ish things — but learned from behaviour rather than declared, and wrong guesses cost one click.

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

- **The onboarding tour waits for the user instead of driving the app**: a step ends when the *next* anchor appears (`advance: "appear"`), so "press + dish" is a real press and whatever lands in the plan is genuinely the user's. Driving the UI from the tour — auto-opening the picker, planting a demo dish — would have meant writing to and then cleaning up `weekPlan`, which is synced to Firestore and exported to JSON; a demo entry surviving a reload is a worse bug than a tour the user ignores.

- **"Appeared" means appeared since the step began, not merely present**: the picker remembers its source per slot, so the amount field is often already on screen when the tour reaches "and here are the products" — and a step that checked mere presence skipped the one bubble explaining how to get there. The same trap hid the "open the Recipes tab" step from anyone already on it. The step records what was there when it started and only reacts to a change.

- **A queued tour waits for its opening anchor**: starting is not "the tour is due", it is "the first anchor is on screen". Switching tabs while one tour runs used to hand the next one a page with none of its anchors, and it raced through every step in silence and marked itself seen. As a second line of defence a tour is only recorded as seen if it actually showed a bubble or was explicitly skipped. Waiting is per-entry, not head-of-line: the shopping tour waits on a plan that is still empty, and must not hold up the tour for the tab the user is actually looking at.

- **Anchors are `data-tour` attributes, not refs**: the targets sit in five components three levels apart, two of them inside overlays that mount and unmount, so a ref would have to be threaded through every prop list in between. `querySelector` also takes the first match in document order for free — exactly the Monday-breakfast `+ dish` and the first recipe card — so the attribute goes on every instance with no conditionals.

- **A missing anchor drops its step rather than stalling the tour**: the reset-tags button only exists once a tag is active, the amount field only when the picker shows products, and the add-on `＋` only once a dish is in the plan. One rule — gone for longer than ~400 ms means the user went elsewhere — covers all three, plus closing an overlay mid-tour. That is also how the "pick a dish" step ends: the picker unmounting takes the anchor with it.

- **Four short tours, not one**: `week` on first page open, `shopping` and `recipes` on first visit to those tabs, `account` on first sign-in (signing in is when the products tab, own recipes and the export appear at all). Each records itself separately, so abandoning one does not silently burn the others. `shopping` is a single bubble on the PDF button — the counter and "skip" are hidden when a tour has one step, since there is no progress to report and nothing to skip ahead of.

- **Replaying works with what is on screen; an offer waits for its cue**: `startTour` needs only *some* anchor present, so pressing 💡 inside a recipe picks up at the tag steps instead of demanding the list first. It returns `false` when the tour has no anchor at all — an empty shopping list — and the header falls back to the planner, which is what fills it.

- **Tour flags merge as a union**: `localStorage` keeps this browser's record and `settings.tour` the account's, and hydration takes `{...account, ...local}`. Flags are only ever written as `true`, so a union is the whole merge — a tour watched on a laptop stays quiet on a phone, one watched before signing up stays quiet after, and one watched while signed in stays quiet after signing out.

- **Privacy by construction**: every document lives under `users/{uid}`, so `firestore.rules` is a single rule and there is no shared writable space — three users adding three yogurts never see each other's.

- **App degrades gracefully without Firebase**: `isFirebaseConfigured` returns false when env vars are missing, services stay null, and the UI hides all account features rather than crashing.



## Components



- **App.jsx**: orchestrates tabs, language switcher, hooks

- **WeekPlanner**: 7×4 slots holding a list of dishes, per-dish add-on rows, inline amount editing, batch auto-fill, day KBJU + micronutrient toggle

- **DishPicker**: one overlay for both roles (dish / add-on); search, recipes ↔ products switch, grouped tag filters remembered per slot+role, amount field with kcal and household hint, and a mode for assigning personal tags

- **TagFilterBar**: grouped tag chips with per-group headings; shared by RecipeList, DishPicker and RecipeEditor so filtering looks the same everywhere

- **DishTagChips**: personal tags on a dish — toggle and inline create; an edit mode turns the same chips into rename (click) and delete (✕, confirmed), because two icons per chip would triple the width of a row that is read far more often than edited

- **ShoppingList**: categorized list with household measure + metric in parentheses, checkboxes, PDF, daily energy + micros

- **RecipeList**: search, grouped tag filters (vocabulary OR personal), kcal + protein on cards

- **RecipeDetail**: energy bar, micronutrients, ingredients, steps, personal tags

- **NutrientSummary**: shared collapsible micro list

- **AboutOverlay**: bilingual about — a numbered "building a plan" walkthrough (dish vs product, which products can be a dish and which only an add-on, amounts, add-ons, tags) ahead of the feature list; documents USDA nutrition. Deliberately holds no recipe count: the catalog is user-extensible, so a number there is either stale or noise

- **AuthPanel**: email/password sign in, sign up, reset; maps Firebase error codes to translated messages

- **AccountPanel**: counts of own/edited/hidden recipes and products, JSON export/import, sign out

- **BrandProducts**: per-ingredient grouping, label form (kcal/protein/fat/carbs/fiber/sugar/sodium), default toggle

- **RecipeEditor**: shared by create, edit-own and edit-base flows; live per-portion preview plus warnings for ingredients that could not be costed

- **TourProvider / TourBubble**: the onboarding tour — a bubble beside a highlighted control, with a counter, "skip" and "next". The layer is `pointer-events: none` except the bubble itself, so the highlighted button stays clickable, which it has to be: the tour advances by watching the user press it. A 💡 button in the header replays the tour of the current tab



## Patterns



- Hooks for state (`useWeekPlan`) and derived data (`useShoppingList`, `useRecipes`)

- Day nutrition aggregation centralized in `src/utils/planEntries.js` (`sumDayNutrition`), with nutrient keys, units and rounding in `src/utils/nutrition.js`; imports stay one-directional (`planEntries` → `nutrition`)

- All UI strings via `t()` from react-i18next

- `formatIngredient(ing, t, lang)` builds display strings from structured data

- Contexts for remote state (`AuthContext`, `UserDataContext`); components never touch Firestore directly, they call mutators from `useUserData()`

- Firestore subscriptions are `onSnapshot`-based, so an edit in one tab updates every view without manual refetching

- `useWeekPlan` treats stored data as authoritative only at hydration, then local edits win and are written back debounced; pruning of deleted recipes waits until the overlay has loaded, and an anonymous plan is carried into a newly created account rather than overwritten

- `useDishTags` follows the same hydrate-then-local-wins pattern as `useWeekPlan`, and lives in `App.jsx` (one instance passed down), so the planner and the recipes tab can't drift apart

- Nested Firestore maps are replaced wholesale with `setDoc(..., { mergeFields: ["settings.dishTags"] })`, otherwise a plain merge would resurrect deleted tags and assignments

- Tours are offered from `App.jsx` with `requestTour(TAB_TOURS[currentTab])` whenever their subject is on screen; the provider owns the decisions (already seen? one already running? is the first anchor there yet?) so the trigger sites stay one line each and cannot double-start. An offer that cannot start yet stays queued and begins the moment its anchor shows up, without blocking the others behind it


