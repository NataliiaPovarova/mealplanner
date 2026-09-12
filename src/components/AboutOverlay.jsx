import { useTranslation } from "react-i18next";

export default function AboutOverlay({ onClose }) {
  const { i18n } = useTranslation();
  const lang = i18n.language;

  const sectionTitle = {
    fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em",
    opacity: 0.45, fontWeight: 600, margin: "24px 0 8px",
  };
  const bodyText = { fontSize: 14, lineHeight: 1.7, margin: "0 0 8px" };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--bg-color, #fffdf8)", borderRadius: 12,
          maxWidth: 620, width: "100%", maxHeight: "85vh", overflowY: "auto",
          padding: "28px 28px 20px", position: "relative",
          boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
          fontFamily: "'Georgia', 'Noto Serif', serif",
          color: "var(--text-color, #2d2a24)", lineHeight: 1.6,
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "sticky", top: 0, float: "right",
            background: "var(--bg-color, #fffdf8)", border: "none",
            fontSize: 22, cursor: "pointer", padding: "0 4px",
            color: "var(--text-color, #2d2a24)", opacity: 0.5, zIndex: 1,
          }}
          onMouseOver={e => e.currentTarget.style.opacity = "1"}
          onMouseOut={e => e.currentTarget.style.opacity = "0.5"}
        >✕</button>

        <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 12px", letterSpacing: "-0.02em" }}>
          {lang === "ru" ? "О проекте" : "About"}
        </h2>

        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {[["ru", "Русский"], ["en", "English"]].map(([id, label]) => (
            <button key={id} onClick={() => i18n.changeLanguage(id)} style={{
              padding: "5px 14px", borderRadius: 16, fontSize: 13, fontFamily: "inherit", cursor: "pointer",
              border: lang === id ? "1.5px solid var(--text-color, #2d2a24)" : "1px solid var(--border-color, #e0dcd4)",
              background: lang === id ? "var(--text-color, #2d2a24)" : "transparent",
              color: lang === id ? "#fff" : "var(--text-color, #2d2a24)",
              fontWeight: lang === id ? 600 : 400, transition: "all 0.15s ease",
            }}>{label}</button>
          ))}
        </div>

        {lang === "ru" ? (
          <div>
            <p style={bodyText}>Приложение для планирования питания на неделю с автоматической генерацией списка продуктов.</p>
            <h3 style={sectionTitle}>Как собрать план</h3>
            <ol style={{ fontSize: 14, paddingLeft: 18, margin: 0, lineHeight: 1.8 }}>
              <li><strong>Приём пищи собирается из блюд.</strong> В каждом приёме пищи есть кнопка «+ блюдо», и блюд может быть сколько нужно: например, овсянка и яйцо на завтрак.</li>
              <li><strong>Блюдо — это рецепт или отдельный продукт.</strong> В окне выбора переключатель «Рецепты / Продукты»: рецепт добавляется порцией, а продукт — с количеством в граммах или миллилитрах. Количество правится прямо в плане, а при наведении на поле видна примерная мерка — ложки, горсти, штуки.</li>
              <li><strong>Что бывает блюдом, а что добавкой.</strong> Крупные источники нутриентов — крупы, макароны, яйца, мясо, рыба, морепродукты, творог — можно поставить самостоятельным блюдом. Овощи, фрукты, ягоды, зелень, сыр, орехи, мёд, масла, соусы, хлеб — добавкой. Многие продукты доступны и так, и так, поэтому в списке продуктов для блюда и для добавки набор разный.</li>
              <li><strong>Добавка крепится к блюду, а не к приёму пищи.</strong> Кнопка «＋» в строке блюда открывает выбор добавки, так что мёд попадёт именно в овсянку. Калории добавки идут в КБЖУ дня, а её ингредиенты — в список закупки.</li>
              <li><strong>Теги нужны, чтобы не листать весь список.</strong> Фильтры в окне выбора сгруппированы, а выбранный фильтр запоминается для этого приёма пищи. Свои теги ставятся кнопкой «мои теги» там же или в карточке рецепта.</li>
            </ol>
            <h3 style={sectionTitle}>Возможности</h3>
            <ul style={{ fontSize: 14, paddingLeft: 18, margin: 0, lineHeight: 1.8 }}>
              <li><strong>Планировщик недели</strong>: завтрак, обед, ужин и перекус на каждый день, в каждый приём пищи — сколько блюд нужно</li>
              <li><strong>Свои рецепты</strong>: базовый каталог с пошаговыми инструкциями и советами можно дополнять своими рецептами, а базовые — править или скрывать (нужен аккаунт)</li>
              <li><strong>Batch cooking</strong>: блюда на 2–3 дня автоматически заполняют следующие дни</li>
              <li><strong>Контроль батчей</strong>: предупреждения, если количество порций не совпадает с рецептом</li>
              <li><strong>Умный список закупки</strong>: ингредиенты агрегируются во вкладке «Закупка» и группируются по категориям (овощи, белок, молочное, бобовые, крупы, прочее); ингредиенты-ссылки (например, порция тахинного соуса) исключаются из списка</li>
              <li><strong>Примерные мерки</strong>: в закупке сначала идёт примерная мера из рецептов (штуки, банки, ломтики, ложки, горсти), а граммы и миллилитры — в скобках: «2 шт. (272 г)». Если у продукта нет естественной «штуки», считается количество использований за неделю: «4 шт. (650 г)» йогурта — это четыре порции. Крупы и молоко остаются в граммах и миллилитрах</li>
              <li><strong>PDF на неделю</strong>: скачай план и все рецепты одним файлом — открывай на телефоне прямо на кухне</li>
              <li><strong>Фильтрация по тегам</strong>: теги сгруппированы — из чего (крупа, мясо, овощи), что это (тёплый боул, тост, смузи), готовка (быстро, впрок, рисоварка) и акценты (без мяса, богато железом)</li>
              <li><strong>Свои теги</strong>: приёмы пищи не зашиты в рецепты — пометь, что для тебя завтрак, обед, ужин или перекус, и добавь любые собственные теги. Любой тег можно переименовать или удалить, включая четыре предложенных</li>
              <li><strong>Питательная ценность</strong>: КБЖУ и микронутриенты (клетчатка, минералы, витамины) пересчитаны по <a href="https://fdc.nal.usda.gov/" target="_blank" rel="noreferrer">USDA FoodData Central</a>; в плане недели и закупке — сводка за день</li>
            </ul>
            <h3 style={sectionTitle}>Философия</h3>
            <p style={{ ...bodyText, fontStyle: "italic", opacity: 0.75 }}>Если продукт качественный и свежий, добавки и специи ему не нужны.</p>
            <p style={bodyText}>Минимум готовки (большинство рецептов ≤ 10 минут), минимум ингредиентов, акцент на свежие и качественные продукты. Крупы и белок готовятся в рисоварке или на плите, свежие овощи добавляются перед едой.</p>
            <h3 style={sectionTitle}>Структура рецептов</h3>
            <ul style={{ fontSize: 14, paddingLeft: 18, margin: 0, lineHeight: 1.8 }}>
              <li>Название, эмодзи-иконка, тип (тёплый боул, холодный боул, лапша, смузи, соус)</li>
              <li>Теги для фильтрации из общего словаря (например, <code>grain</code>, <code>meat</code>, <code>cold-bowl</code>, <code>quick</code>, <code>meat-free</code>)</li>
              <li>Количество порций и дней хранения (batch)</li>
              <li>Время подготовки и готовки</li>
              <li>КБЖУ и микронутриенты на порцию — оценка по USDA (количества в г/мл; кулинарные эквиваленты в заметках). Бренды и «щепотки» дают погрешность — не медицинский расчёт</li>
              <li>Список ингредиентов и пошаговая инструкция — ингредиенты могут быть «ссылками» на другие рецепты (например, порция тахинного соуса) и автоматически исключаются из списка закупки</li>
              <li>Советы и рекомендации</li>
            </ul>
            <h3 style={sectionTitle}>Технологии</h3>
            <p style={bodyText}>React 18 · Vite · jsPDF · CSS-in-JS (без внешних UI-библиотек)</p>
            <h3 style={sectionTitle}>Лицензия</h3>
            <p style={bodyText}>MIT</p>
          </div>
        ) : (
          <div>
            <p style={bodyText}>A weekly meal planning app with automatic grocery list generation.</p>
            <h3 style={sectionTitle}>Building a plan</h3>
            <ol style={{ fontSize: 14, paddingLeft: 18, margin: 0, lineHeight: 1.8 }}>
              <li><strong>A meal is built from dishes.</strong> Every meal has a “+ dish” button and takes as many dishes as you need — porridge and an egg for breakfast, say.</li>
              <li><strong>A dish is a recipe or a single product.</strong> The picker has a “Recipes / Products” switch: a recipe is added by the portion, a product with an amount in grams or millilitres. Amounts are editable right in the plan, and hovering the field shows an approximate household measure — spoons, handfuls, pieces.</li>
              <li><strong>What can be a dish, and what only an add-on.</strong> The big nutrient sources — grains, pasta, eggs, meat, fish, seafood, cottage cheese — can stand on their own as a dish. Vegetables, fruit, berries, greens, cheese, nuts, honey, oils, sauces and bread come as add-ons. Many products do both, which is why the product list differs between a dish and an add-on.</li>
              <li><strong>An add-on belongs to a dish, not to the meal.</strong> The “＋” button in a dish row opens the add-on picker, so honey lands in the porridge specifically. Its calories count towards the daily totals and its ingredients towards the shopping list.</li>
              <li><strong>Tags are there to save you the scrolling.</strong> Filters in the picker come in groups, and the chosen filter is remembered for that meal. Your own tags go on from the “my tags” button there or from the recipe card.</li>
            </ol>
            <h3 style={sectionTitle}>Features</h3>
            <ul style={{ fontSize: 14, paddingLeft: 18, margin: 0, lineHeight: 1.8 }}>
              <li><strong>Weekly planner</strong>: breakfast, lunch, dinner, and snack for each day, with as many dishes per meal as you need</li>
              <li><strong>Your own recipes</strong>: the starter catalog comes with step-by-step instructions and tips, and you can add recipes of your own or edit and hide the shipped ones (account needed)</li>
              <li><strong>Batch cooking</strong>: dishes for 2–3 days automatically fill the following days</li>
              <li><strong>Batch validation</strong>: warnings when portion counts do not match the recipe</li>
              <li><strong>Smart shopping list</strong>: ingredients are aggregated on the Shopping tab and grouped by category (produce, protein, dairy, legumes, grains, pantry); reference ingredients (like a tahini-sauce portion) are excluded so you only see what to actually buy</li>
              <li><strong>Household measures</strong>: every shopping line starts with an approximate measure from the recipes (pieces, cans, slices, spoons, handfuls) and keeps grams or millilitres in parentheses: "2 pcs (272 g)". Ingredients without a natural piece size show how many times they are used during the week — "4 pcs (650 g)" of yogurt means four servings. Grains and milk stay in grams and millilitres</li>
              <li><strong>Downloadable PDF</strong>: export the weekly plan and all recipes as a single file — open it on your phone right in the kitchen</li>
              <li><strong>Tag filtering</strong>: tags come in groups — what's in it (grain, meat, vegetables), what it is (warm bowl, toast, smoothie), cooking (quick, batch, rice cooker) and accents (meat-free, iron-rich)</li>
              <li><strong>Your own tags</strong>: meals are not baked into the recipes — mark yourself what counts as breakfast, lunch, dinner or a snack, and add any tags of your own. Every tag can be renamed or deleted, the four suggested ones included</li>
              <li><strong>Nutrition</strong>: macros and micronutrients (fiber, minerals, vitamins) recalculated from <a href="https://fdc.nal.usda.gov/" target="_blank" rel="noreferrer">USDA FoodData Central</a>; the week plan and shopping tab show a daily summary</li>
            </ul>
            <h3 style={sectionTitle}>Philosophy</h3>
            <p style={{ ...bodyText, fontStyle: "italic", opacity: 0.75 }}>If the product is high quality and fresh, it does not need additives or spices.</p>
            <p style={bodyText}>Minimal cooking (most recipes take ≤ 10 minutes), minimal ingredients, focus on fresh, quality products. Grains and protein are cooked in a rice cooker or on the stove; fresh vegetables are added before eating.</p>
            <h3 style={sectionTitle}>Recipe Structure</h3>
            <ul style={{ fontSize: 14, paddingLeft: 18, margin: 0, lineHeight: 1.8 }}>
              <li>Name, emoji icon, type (warm bowl, cold bowl, noodles, smoothie, sauce)</li>
              <li>Tags for filtering from the shared vocabulary (e.g. <code>grain</code>, <code>meat</code>, <code>cold-bowl</code>, <code>quick</code>, <code>meat-free</code>)</li>
              <li>Servings and storage days (batch)</li>
              <li>Prep and cook time</li>
              <li>Macros and micronutrients per serving — USDA-based estimates (amounts in g/ml; culinary equivalents in notes). Brands and “pinches” introduce error — not medical advice</li>
              <li>Ingredient list and step-by-step instructions — ingredients can be "references" to other recipes (e.g. a portion of tahini sauce) and are automatically excluded from the shopping list</li>
              <li>Tips and recommendations</li>
            </ul>
            <h3 style={sectionTitle}>Tech Stack</h3>
            <p style={bodyText}>React 18 · Vite · jsPDF · CSS-in-JS (no external UI libraries)</p>
            <h3 style={sectionTitle}>License</h3>
            <p style={bodyText}>MIT</p>
          </div>
        )}
      </div>
    </div>
  );
}
