# Meal Plan System / Планировщик еды

<details>
<summary><strong>English</strong></summary>

A weekly meal planning app with automatic grocery list generation. Available in Russian and English.

Deployed with Vercel here: https://mealplanner-three-coral.vercel.app/

## Features

- **A starter catalog of recipes** with step-by-step instructions and tips — extend it with your own recipes, or edit and hide the shipped ones
- **Recipe types**: warm bowl, cold bowl, noodles, smoothie, sauce
- **Weekly planner**: breakfast, lunch, dinner, and snack for each day, each holding as many dishes as the meal needs
- **A dish is a recipe or a single product**: plan "cottage cheese with berries" as a recipe, or plain cottage cheese with an amount in grams. Amounts default to one sensible portion (with a household measure such as `≈ 5 tbsp` on hover) and can be edited inline; nutrition and the shopping list follow immediately. Which products may stand alone comes from the catalog: the big nutrient sources (grains, pasta, eggs, meat, fish, seafood, cottage cheese) can be a dish, accents (vegetables, fruit, berries, greens, cheese, nuts, honey, oils, sauces, bread) come as add-ons, and many products do both
- **Add-ons per dish**: berries, nuts, honey, sauces, cheese, oils, bread and other products — plus sauce recipes tagged `add-on` — attach to a specific dish rather than to the slot. Their calories are added to that day's totals, their ingredients flow into the shopping list, and they appear indented in the corresponding cell of the PDF plan. Add-on recipes can also be referenced from other recipes as a virtual "reference ingredient"
- **Batch cooking**: dishes for 2–3 days automatically fill the following days
- **Batch validation**: warnings when portion counts do not match the recipe
- **Categorized shopping list**: ingredients grouped by category (produce, protein, dairy, legumes, grains, pantry) with automatic unit normalization (1000g → 1kg); reference ingredients are excluded from the list so you only see what to actually buy
- **Household measures in the shopping list**: each line starts with an approximate measure (pieces, cans, slices, spoons, handfuls) derived from the recipe conversion table, with grams or millilitres in parentheses — e.g. `2 pcs (272 g)`. Ingredients without a natural piece size fall back to how many times they are used during the week (`4 pcs (650 g)` of yogurt = four servings), and goods bought by weight (grains, milk) keep grams only
- **Downloadable PDF**: export the weekly plan and all referenced recipes as a single PDF — no account needed, works offline once downloaded
- **Grouped tag filtering**: one vocabulary shared by recipes and products, split into what's in it (`grain`, `meat`, `veg`…), what it is (`warm-bowl`, `toast`, `smoothie`…), cooking (`quick`, `batch`, `rice-cooker`…) and accents (`meat-free`, `iron-rich`…). The same filter bar serves the recipes tab and the dish picker, and the picker remembers the filter per meal
- **Your own meal tags**: meal times are deliberately absent from the catalog, because everyone draws the line between lunch and dinner somewhere else. Mark yourself what counts as breakfast, lunch, dinner or a snack — and add any tags of your own, which you can rename or delete at any time (including the four suggested meals: rename "snack" into "second breakfast" if that is your day). They live beside the catalog, so tagging a shipped recipe never turns it into an edited copy
- **USDA nutrition**: macros (kcal, protein, fat, carbs, fiber) and curated micronutrients recalculated from [FoodData Central](https://fdc.nal.usda.gov/api-guide); daily totals appear on the week plan and shopping tab
- **Optional accounts** (Firebase Auth + Firestore, free tier): sign in to write your own recipes, edit or hide the built-in ones, and save your week plan. Everything is strictly private — there is no shared writable space, so the catalog never fills up with other people's entries. Passwords are never stored by this app. Without an account the base catalog works exactly as before; see [FIREBASE_SETUP.md](FIREBASE_SETUP.md)
- **Brand products**: record the yogurt or bread you actually buy as your own variant of a catalog ingredient, enter the label values per 100 g, and mark it as your default — every recipe, built-in ones included, is re-costed from your products. Fields you leave blank keep their USDA values, so vitamins are not zeroed out
- **Export your data**: one JSON file with your recipes, products, settings, and week plan, importable back — the free Firebase tier has no automatic backups

> Nutrition values are **approximate** estimates from USDA FDC (CC0). Culinary units were converted to g/ml with household averages; branded products (e.g. mozzarella, Greek yogurt) use a typical SR Legacy / Foundation entry, not your specific brand. Not for medical use.

## Philosophy

> If the product is high quality and fresh, it does not need additives or spices.

Minimal cooking (most recipes take ≤ 10 minutes), minimal ingredients, focus on fresh, high-quality produce. Grains and protein are cooked in a rice cooker or on the stove; fresh vegetables are added before eating.

## Getting Started

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev
```

Open http://127.0.0.1:5173/ in your browser.

> **Note:** Use `127.0.0.1` instead of `localhost` — on some systems `localhost` resolves to an IPv6 address that Vite does not bind to by default.

To create a production build and preview it locally:

```bash
npm run build
npm run preview
```

The preview server will be available at http://127.0.0.1:4173/.

## Nutrition data (USDA)

Ingredient nutrient cache and recipe macros are built offline via CLI (API key in `.env` as `USDA_API_KEY`, never commit `.env`):

```bash
# Convert culinary units in recipes to g/ml (writes notes with ≈ equivalents)
npm run nutrition:normalize-units

# Same, plus recompute already converted lines from their ≈ notes
# (use after editing conversion factors in unit-conversions.json)
npm run nutrition:normalize-units -- --refresh

# Fetch missing USDA FoodData Central entries into src/data/nutrition/
npm run nutrition:fetch

# Recalculate perPortion + perPortionNutrients on all recipes (en + ru)
npm run nutrition:recalc
```

Data files:

- `src/data/unit-conversions.json` — tbsp/tsp/pcs/… → g/ml, plus `shoppingUnits` / `bulkByWeight` that drive the household measures in the shopping list
- `src/data/nutrition/fdc-mapping.json` — ingredient id → FDC query / fdcId
- `src/data/nutrition/ingredients-usda.json` — curated `per100g` + raw API payload

## Tech Stack

- React 18
- Vite
- react-i18next (internationalization)
- jsPDF + jsPDF-AutoTable (client-side PDF generation)
- No external UI libraries — CSS-in-JS only

## Project Structure

```
src/
  App.jsx                  # Shell: header, language switcher, tab routing
  constants.js             # Shared constants and ingredient formatting
  main.jsx                 # Entry point, i18n initialization
  i18n/                    # Internationalization config + string catalogs
    locales/ru/ui.json     # Russian UI strings
    locales/en/ui.json     # English UI strings
  data/
    ingredients.json       # Ingredient catalog (id → names, category, tags, roles, default portions)
    unit-conversions.json  # Culinary unit → g/ml estimates
    nutrition/             # USDA FDC mapping + cached nutrients
    tags.json              # Tag vocabulary: tag ID → group (labels live in i18n)
    recipes/
      ru.json              # 36 recipes in Russian (35 meals + 1 add-on sauce)
      en.json              # 36 recipes in English (35 meals + 1 add-on sauce)
  hooks/
    useWeekPlan.js         # Weekly plan state (dishes + add-ons) and batch logic
    useDishTags.js         # Personal tags: definitions and per-dish assignments
    useShoppingList.js     # Shopping list aggregation with categories
    useRecipes.js          # Language-aware recipe loader
  utils/
    nutrition.js           # Day totals for macros + micronutrients
    shoppingMeasure.js     # Household measure for shopping-list lines
    generateWeekPlanPdf.js # PDF export (plan table + recipes)
  scripts/
    fetch-usda-nutrition.mjs
    recalculate-recipe-nutrition.mjs
    normalize-recipe-units.mjs
  components/
    WeekPlanner.jsx        # Week plan tab
    ShoppingList.jsx       # Shopping tab with category grouping
    RecipeList.jsx         # Recipe browser with tag filtering
    RecipeDetail.jsx       # Single recipe view
    NutrientSummary.jsx    # Collapsible micronutrient list
    AboutOverlay.jsx       # About modal
```

## Recipe Structure

Each recipe includes:

- Name, emoji icon, type (warm bowl, cold bowl, noodles, smoothie, sauce)
- Tags from the shared vocabulary in `tags.json` (e.g. `grain`, `meat`, `cold-bowl`, `quick`, `meat-free`) — never a meal time, that is the user's own call
- Servings and storage days (batch)
- Prep and cook time
- Macros per serving (`perPortion`: kcal, protein, fat, carbs, fiber) and micronutrients (`perPortionNutrients`), recalculated from USDA FDC
- Structured ingredient list with amounts in **g/ml** (culinary equivalents in `note`) — supports "reference ingredients" that point at other recipes (e.g. a portion of tahini sauce) and are automatically excluded from the shopping list
- Step-by-step instructions
- Tips and recommendations so you cannot mess it up (I am hopeless in the kitchen myself, so Opus 4.6 / 4.7 tried hard)

## Planned Updates

- [x] ~~Add ability to manually add, remove, and edit tags~~ (done — your own tags on any dish: create, rename, delete)
- [x] ~~Add the same for recipes and allow changing calorie values~~ (done — user accounts with private recipes and brand products)
- [x] ~~Add English translation~~ (done — full bilingual support)
- [x] ~~Move the recipes to a database and improve produce count~~ (done — structured JSON data + categorized shopping list)
- [x] ~~Publish the app on GitHub Pages~~ (published on Vercel)
- [x] ~~Downloadable PDF with the weekly plan and recipes~~ (done — client-side PDF via jsPDF)

## License

MIT

</details>

<details>
<summary><strong>Русский</strong></summary>

Приложение для планирования питания на неделю с автоматической генерацией списка продуктов. Доступно на русском и английском языке.

Доступно по ссылке здесь: https://mealplanner-three-coral.vercel.app/ (использую Vercel)

## Возможности

- **Базовый каталог рецептов** с пошаговыми инструкциями и советами — его можно дополнять своими рецептами, а базовые править или скрывать
- **Типы рецептов**: тёплый боул, холодный боул, лапша, смузи, соус
- **Планировщик недели**: завтрак, обед, ужин и перекус на каждый день, в каждом приёме пищи — сколько блюд нужно
- **Блюдо — это рецепт или отдельный продукт**: можно поставить в план и «творог с ягодами» как рецепт, и просто творог с количеством в граммах. Количество по умолчанию — одна разумная порция (бытовая мерка вида `≈ 5 ст. л.` показывается при наведении), его можно поменять прямо в плане: КБЖУ и закупка пересчитаются сразу
- **Добавки у каждого блюда**: ягоды, орехи, мёд, соусы, сыр, масла, хлеб и другие продукты, а также рецепты-соусы с тегом `add-on`, прикрепляются к конкретному блюду, а не к слоту. Калории добавки прибавляются к дневному итогу, её ингредиенты попадают в закупку, и она отображается с отступом в соответствующей ячейке PDF-плана. Рецепты-добавки также можно упоминать в других рецептах как «ингредиент-ссылку»
- **Batch cooking**: блюда на 2–3 дня автоматически заполняют следующие дни
- **Контроль батчей**: предупреждения, если количество порций не совпадает с рецептом
- **Список закупки по категориям**: ингредиенты сгруппированы (овощи, белок, молочное, бобовые, крупы, прочее) с автоматической нормализацией единиц (1000г → 1кг); ингредиенты-ссылки исключаются из списка, чтобы вы видели только то, что нужно реально купить
- **Примерные мерки в закупке**: в каждой строке сначала идёт примерная мера (штуки, банки, ломтики, ложки, горсти) из таблицы пересчёта рецептов, а граммы или миллилитры — в скобках, например `2 шт. (272 г)`. Для продуктов без естественной «штуки» считается количество использований за неделю (`4 шт. (650 г)` йогурта — это четыре порции), а весовые товары (крупы, молоко) остаются в граммах и миллилитрах
- **PDF на неделю**: скачайте план и все рецепты одним файлом
- **Теги по группам**: единый словарь для рецептов и продуктов, разбитый на «из чего» (`grain`, `meat`, `veg`…), «что это» (`warm-bowl`, `toast`, `smoothie`…), «готовка» (`quick`, `batch`, `rice-cooker`…) и «акценты» (`meat-free`, `iron-rich`…). Одна и та же панель фильтров работает на вкладке рецептов и в выборе блюда, а выбранный фильтр запоминается для каждого приёма пищи
- **Свои теги приёмов пищи**: в каталоге их намеренно нет — каждый по-своему решает, что считать обедом, а что ужином. Помечайте сами, что для вас завтрак, обед, ужин или перекус, и добавляйте любые собственные теги — их можно в любой момент переименовать или удалить, включая четыре предложенных (переименуйте «перекус» во «второй завтрак», если у вас день устроен так). Они лежат рядом с каталогом, поэтому тег на базовом рецепте не превращает его в отредактированную копию
- **Питательная ценность USDA**: КБЖУ и курируемые микронутриенты пересчитаны по [FoodData Central](https://fdc.nal.usda.gov/api-guide); дневные итоги — в плане недели и на вкладке закупки
- **Аккаунты (по желанию)** на Firebase Auth + Firestore, бесплатный тариф: после входа можно записывать свои рецепты, править и скрывать базовые, а план недели сохраняется. Всё строго приватно — общего пространства для записи нет, поэтому каталог не засоряется чужими записями. Пароли приложение не хранит. Без аккаунта базовый каталог работает как раньше; настройка — в [FIREBASE_SETUP.md](FIREBASE_SETUP.md)
- **Брендовые продукты**: заведите тот йогурт или хлеб, который реально покупаете, как свой вариант ингредиента из каталога, перепишите значения с этикетки на 100 г и назначьте продуктом по умолчанию — КБЖУ пересчитается во всех рецептах сразу, включая базовые. Незаполненные поля останутся по данным USDA, чтобы витамины не обнулились
- **Выгрузка данных**: один JSON-файл с вашими рецептами, продуктами, настройками и планом недели, который можно загрузить обратно — автоматических бэкапов на бесплатном тарифе Firebase нет

> Значения **приблизительные**, источник — USDA FDC (CC0). Кулинарные единицы переведены в г/мл по бытовым средним; брендовые продукты (моцарелла, греческий йогурт) взяты как типичная запись SR Legacy / Foundation, не ваш конкретный бренд. Не для медицинских целей.

## Философия

> Если продукт качественный и свежий, добавки и специи ему не нужны.

Минимум готовки (большинство рецептов занимают ≤ 10 минут), минимум ингредиентов, акцент на свежие и качественные продукты. Крупы и белок готовятся в рисоварке или на плите, свежие овощи добавляются перед едой.

## Запуск

```bash
# Установить зависимости
npm install

# Запустить в режиме разработки
npm run dev
```

Откройте http://127.0.0.1:5173/ в браузере.

> **Примечание:** Используйте `127.0.0.1`, а не `localhost` — на некоторых системах `localhost` указывает на IPv6-адрес, к которому Vite по умолчанию не привязывается.

Чтобы собрать продакшен-версию и просмотреть её локально:

```bash
npm run build
npm run preview
```

Preview-сервер будет доступен по адресу http://127.0.0.1:4173/.

## Данные о питательности (USDA)

Кэш нутриентов и КБЖУ рецептов собираются офлайн через CLI (ключ API в `.env` как `USDA_API_KEY`, файл `.env` не коммитить):

```bash
# Перевести кулинарные единицы в рецептах в г/мл (в note — ≈ эквиваленты)
npm run nutrition:normalize-units

# То же плюс пересчёт уже сконвертированных строк по их ≈ заметкам
# (нужно после правки коэффициентов в unit-conversions.json)
npm run nutrition:normalize-units -- --refresh

# Догрузить недостающие записи USDA в src/data/nutrition/
npm run nutrition:fetch

# Пересчитать perPortion + perPortionNutrients во всех рецептах (en + ru)
npm run nutrition:recalc
```

Файлы данных:

- `src/data/unit-conversions.json` — ст.л./ч.л./шт./… → г/мл, а также `shoppingUnits` / `bulkByWeight` — на их основе строятся примерные мерки в закупке
- `src/data/nutrition/fdc-mapping.json` — id ингредиента → запрос / fdcId
- `src/data/nutrition/ingredients-usda.json` — курируемый `per100g` + сырой ответ API

## Технологии

- React 18
- Vite
- react-i18next (интернационализация)
- jsPDF + jsPDF-AutoTable (генерация PDF на клиенте)
- Без внешних UI-библиотек — только CSS-in-JS

## Структура проекта

```
src/
  App.jsx                  # Оболочка: шапка, переключатель языка, вкладки
  constants.js             # Общие константы и форматирование ингредиентов
  main.jsx                 # Точка входа, инициализация i18n
  i18n/                    # Конфигурация i18n + каталоги строк
    locales/ru/ui.json     # Русские строки интерфейса
    locales/en/ui.json     # Английские строки интерфейса
  data/
    ingredients.json       # Каталог ингредиентов (id → названия, категория, теги, роли, порции)
    unit-conversions.json  # Кулинарные единицы → г/мл
    nutrition/             # Маппинг USDA FDC + кэш нутриентов
    tags.json              # Словарь тегов: ID тега → группа (названия — в i18n)
    recipes/
      ru.json              # 36 рецептов на русском (35 блюд + 1 соус-добавка)
      en.json              # 36 рецептов на английском (35 блюд + 1 соус-добавка)
  hooks/
    useWeekPlan.js         # Состояние плана (блюда + добавки) и batch-логика
    useDishTags.js         # Личные теги: словарь и привязка к блюдам
    useShoppingList.js     # Агрегация списка закупки по категориям
    useRecipes.js          # Загрузка рецептов с учётом языка
  utils/
    nutrition.js           # Итоги дня: КБЖУ + микронутриенты
    shoppingMeasure.js     # Примерная мерка для строк закупки
    generateWeekPlanPdf.js # Экспорт в PDF (таблица плана + рецепты)
  scripts/
    fetch-usda-nutrition.mjs
    recalculate-recipe-nutrition.mjs
    normalize-recipe-units.mjs
  components/
    WeekPlanner.jsx        # Вкладка «План недели»
    ShoppingList.jsx       # Вкладка «Закупка» с группировкой по категориям
    RecipeList.jsx         # Просмотр рецептов с фильтрацией по тегам
    RecipeDetail.jsx       # Отдельный рецепт
    NutrientSummary.jsx    # Сворачиваемый список микронутриентов
    AboutOverlay.jsx       # Модальное окно «О проекте»
```

## Структура рецептов

Каждый рецепт включает:

- Название, эмодзи-иконку, тип (тёплый боул, холодный боул, лапша, смузи, соус)
- Теги из общего словаря в `tags.json` (например, `grain`, `meat`, `cold-bowl`, `quick`, `meat-free`) — без приёмов пищи: их пользователь расставляет сам
- Количество порций и дней хранения (batch)
- Время подготовки и готовки
- КБЖУ на порцию (`perPortion`) и микронутриенты (`perPortionNutrients`), пересчитанные по USDA FDC
- Структурированный список ингредиентов с количеством в **г/мл** (кулинарные эквиваленты в `note`) — поддерживает «ингредиенты-ссылки», которые указывают на другие рецепты (например, порция тахинного соуса) и автоматически исключаются из списка закупки
- Пошаговую инструкцию
- Советы и рекомендации, чтобы вы не могли ничего испортить (у меня самой руки из попы, так что мы с Opus 4.6 / 4.7 постарались)

## Планируемые доработки

- [x] ~~Добавить возможность вручную добавлять, удалять и изменять теги~~ (готово — свои теги на любом блюде: создание, переименование, удаление)
- [x] ~~Добавить возможность то же самое делать с рецептами и менять для них калорийность~~ (готово — аккаунты с приватными рецептами и брендовыми продуктами)
- [x] ~~Сделать перевод на английский язык~~ (готово — полная двуязычная поддержка)
- [x] ~~Перенести рецепты в базу данных и уточнить сборку списка продуктов в Закупке~~ (готово — структурированные JSON-данные + список по категориям)
- [x] ~~Сделать приложение доступным по ссылке на GitHub Pages~~ (опубликовано на Vercel)
- [x] ~~Скачиваемый PDF с планом на неделю и рецептами~~ (готово — генерация PDF на клиенте через jsPDF)

## Лицензия

MIT

</details>
