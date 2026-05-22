# Meal Plan System / Планировщик еды

<details>
<summary><strong>English</strong></summary>

A weekly meal planning app with automatic grocery list generation.

## Features

- **29 recipes** with step-by-step instructions and tips
- **Weekly planner**: breakfast, lunch, dinner, and snack for each day
- **Batch cooking**: dishes for 2–3 days automatically fill the following days
- **Batch validation**: warnings when portion counts do not match the recipe
- **Automatic shopping list**: ingredients are aggregated in the "Shopping" tab
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
- No external UI libraries — CSS-in-JS only

## Recipe Structure

Each recipe includes:

- Name, emoji icon, type (warm bowl, cold bowl, noodles)
- Tags for filtering
- Servings and storage days (batch)
- Prep and cook time
- Macros per serving (kcal, protein, fat, carbs, fiber). These are a **very rough** estimate. Do not rely on them if you need accurate values
- Ingredient list with required amounts
- Step-by-step instructions
- Tips and recommendations so you cannot mess it up (I am hopeless in the kitchen myself, so Opus 4.6 / 4.7 tried hard)

## Planned Updates

- [ ] Add ability to manually add, remove, and edit tags
- [ ] Add the same for recipes and allow changing calorie values
- [ ] Add English translation
- [ ] Publish the app on GitHub Pages

## License

MIT

</details>

<details>
<summary><strong>Русский</strong></summary>

Приложение для планирования питания на неделю с автоматической генерацией списка продуктов.

## Возможности

- **29 рецептов** с пошаговыми инструкциями и советами
- **Планировщик недели**: завтрак, обед, ужин и перекус на каждый день
- **Batch cooking**: блюда на 2–3 дня автоматически заполняют следующие дни
- **Контроль батчей**: предупреждения, если количество порций не совпадает с рецептом
- **Автоматический список закупки**: ингредиенты агрегируются в список во вкладке «Закупка»
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
- Без внешних UI-библиотек — только CSS-in-JS

## Структура рецептов

Каждый рецепт включает:

- Название, эмодзи-иконку, тип (тёплый боул, холодный боул, лапша)
- Теги для фильтрации
- Количество порций и дней хранения (batch)
- Время подготовки и готовки
- КБЖУ на порцию (ккал, белки, жиры, углеводы, клетчатка). Это **очень грубая** оценка. Если вам важны точные значения, пожалуйста, не полагайтесь на них
- Список ингредиентов с указанием нужного количества каждого
- Пошаговую инструкцию
- Советы и рекомендации, чтобы вы не могли ничего испортить (у меня самой руки из попы, так что мы с Opus 4.6 / 4.7 постарались)

## Планируемые доработки

- [ ] Добавить возможность вручную добавлять, удалять и изменять теги
- [ ] Добавить возможность то же самое делать с рецептами и менять для них калорийность
- [ ] Сделать перевод на английский язык
- [ ] Сделать приложение доступным по ссылке на GitHub Pages

## Лицензия

MIT

</details>
