# Meal Plan System / Планировщик еды

<details>
<summary><strong>English</strong></summary>

A weekly meal planning app with automatic grocery list generation. Available in Russian and English.

Deployed with Vercel here: https://mealplanner-three-coral.vercel.app/

## Features

- **36 recipes** (35 meals + 1 add-on sauce) with step-by-step instructions and tips
- **Recipe types**: warm bowl, cold bowl, noodles, smoothie, sauce
- **Weekly planner**: breakfast, lunch, dinner, and snack for each day
- **Batch cooking**: dishes for 2–3 days automatically fill the following days
- **Batch validation**: warnings when portion counts do not match the recipe
- **Add-on recipes**: sauces and other extras (tagged `add-on`) don't appear in slot dropdowns but can be referenced from other recipes as a virtual "reference ingredient" (e.g. the tahini-sauce portion listed in bowl recipes points at the standalone sauce recipe)
- **Categorized shopping list**: ingredients grouped by category (produce, protein, dairy, legumes, grains, pantry) with automatic unit normalization (1000g → 1kg); reference ingredients are excluded from the list so you only see what to actually buy
- **Downloadable PDF**: export the weekly plan and all referenced recipes as a single PDF — no account needed, works offline once downloaded
- **Tag filtering**: lunch, breakfast/dinner, snack, meat-free, iron-rich, with cheese, and more

> Please be careful if calorie counting matters to you. This app is not built for calorie tracking; estimates are approximate, and the source is "trust me, bro".

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
    ingredients.json       # Ingredient catalog (id → names, categories)
    tags.json              # Tag ID → display names per language
    recipes/
      ru.json              # 36 recipes in Russian (35 meals + 1 add-on sauce)
      en.json              # 36 recipes in English (35 meals + 1 add-on sauce)
  hooks/
    useWeekPlan.js         # Weekly plan state and batch logic
    useShoppingList.js     # Shopping list aggregation with categories
    useRecipes.js          # Language-aware recipe loader
  utils/
    generateWeekPlanPdf.js # PDF export (plan table + recipes)
  components/
    WeekPlanner.jsx        # Week plan tab
    ShoppingList.jsx       # Shopping tab with category grouping
    RecipeList.jsx         # Recipe browser with tag filtering
    RecipeDetail.jsx       # Single recipe view
    AboutOverlay.jsx       # About modal
```

## Recipe Structure

Each recipe includes:

- Name, emoji icon, type (warm bowl, cold bowl, noodles, smoothie, sauce)
- Tags for filtering (e.g. `lunch`, `snack`, `meat-free`, `add-on`)
- Servings and storage days (batch)
- Prep and cook time
- Macros per serving (kcal, protein, fat, carbs, fiber). These are a **very rough** estimate. Do not rely on them if you need accurate values
- Structured ingredient list with amounts and units — supports "reference ingredients" that point at other recipes (e.g. a portion of tahini sauce) and are automatically excluded from the shopping list
- Step-by-step instructions
- Tips and recommendations so you cannot mess it up (I am hopeless in the kitchen myself, so Opus 4.6 / 4.7 tried hard)

## Planned Updates

- [ ] Add ability to manually add, remove, and edit tags
- [ ] Add the same for recipes and allow changing calorie values
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

- **36 рецептов** (35 блюд + 1 соус-добавка) с пошаговыми инструкциями и советами
- **Типы рецептов**: тёплый боул, холодный боул, лапша, смузи, соус
- **Планировщик недели**: завтрак, обед, ужин и перекус на каждый день
- **Batch cooking**: блюда на 2–3 дня автоматически заполняют следующие дни
- **Контроль батчей**: предупреждения, если количество порций не совпадает с рецептом
- **Рецепты-добавки**: соусы и другие сопровождения (с тегом `add-on`) не появляются в выпадашках слотов, но могут быть указаны в других рецептах как «виртуальный» ингредиент-ссылка (например, порция тахинного соуса в боуле ссылается на отдельный рецепт соуса)
- **Список закупки по категориям**: ингредиенты сгруппированы (овощи, белок, молочное, бобовые, крупы, прочее) с автоматической нормализацией единиц (1000г → 1кг); ингредиенты-ссылки исключаются из списка, чтобы вы видели только то, что нужно реально купить
- **PDF на неделю**: скачайте план и все рецепты одним файлом
- **Фильтрация по тегам**: обед, завтрак/ужин, перекус, без мяса, богато железом, с сыром и другие

> Пожалуйста, будьте внимательны, если вам важно считать калории. Это приложение создано не для подсчёта калорий, поэтому оценки приблизительные, а источник их — «trust me, bro».

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
    ingredients.json       # Каталог ингредиентов (id → названия, категории)
    tags.json              # ID тегов → названия на каждом языке
    recipes/
      ru.json              # 36 рецептов на русском (35 блюд + 1 соус-добавка)
      en.json              # 36 рецептов на английском (35 блюд + 1 соус-добавка)
  hooks/
    useWeekPlan.js         # Состояние плана и batch-логика
    useShoppingList.js     # Агрегация списка закупки по категориям
    useRecipes.js          # Загрузка рецептов с учётом языка
  utils/
    generateWeekPlanPdf.js # Экспорт в PDF (таблица плана + рецепты)
  components/
    WeekPlanner.jsx        # Вкладка «План недели»
    ShoppingList.jsx       # Вкладка «Закупка» с группировкой по категориям
    RecipeList.jsx         # Просмотр рецептов с фильтрацией по тегам
    RecipeDetail.jsx       # Отдельный рецепт
    AboutOverlay.jsx       # Модальное окно «О проекте»
```

## Структура рецептов

Каждый рецепт включает:

- Название, эмодзи-иконку, тип (тёплый боул, холодный боул, лапша, смузи, соус)
- Теги для фильтрации (например, `lunch`, `snack`, `meat-free`, `add-on`)
- Количество порций и дней хранения (batch)
- Время подготовки и готовки
- КБЖУ на порцию (ккал, белки, жиры, углеводы, клетчатка). Это **очень грубая** оценка. Если вам важны точные значения, пожалуйста, не полагайтесь на них
- Структурированный список ингредиентов с количеством и единицами измерения — поддерживает «ингредиенты-ссылки», которые указывают на другие рецепты (например, порция тахинного соуса) и автоматически исключаются из списка закупки
- Пошаговую инструкцию
- Советы и рекомендации, чтобы вы не могли ничего испортить (у меня самой руки из попы, так что мы с Opus 4.6 / 4.7 постарались)

## Планируемые доработки

- [ ] Добавить возможность вручную добавлять, удалять и изменять теги
- [ ] Добавить возможность то же самое делать с рецептами и менять для них калорийность
- [x] ~~Сделать перевод на английский язык~~ (готово — полная двуязычная поддержка)
- [x] ~~Перенести рецепты в базу данных и уточнить сборку списка продуктов в Закупке~~ (готово — структурированные JSON-данные + список по категориям)
- [x] ~~Сделать приложение доступным по ссылке на GitHub Pages~~ (опубликовано на Vercel)
- [x] ~~Скачиваемый PDF с планом на неделю и рецептами~~ (готово — генерация PDF на клиенте через jsPDF)

## Лицензия

MIT

</details>
