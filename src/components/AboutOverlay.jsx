import { useTranslation } from "react-i18next";
import useRecipes from "../hooks/useRecipes";

export default function AboutOverlay({ onClose }) {
  const { i18n } = useTranslation();
  const meals = useRecipes();
  const lang = i18n.language;
  const addOnCount = meals.filter(r => r.tags?.includes("add-on")).length;
  const mealCount = meals.length - addOnCount;

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
            <h3 style={sectionTitle}>Возможности</h3>
            <ul style={{ fontSize: 14, paddingLeft: 18, margin: 0, lineHeight: 1.8 }}>
              <li><strong>{meals.length} рецептов</strong> ({mealCount} блюд{addOnCount > 0 ? ` + ${addOnCount} соус-добавка` : ""}) с пошаговыми инструкциями и советами</li>
              <li><strong>Планировщик недели</strong>: завтрак, обед, ужин и перекус на каждый день</li>
              <li><strong>Batch cooking</strong>: блюда на 2–3 дня автоматически заполняют следующие дни</li>
              <li><strong>Контроль батчей</strong>: предупреждения, если количество порций не совпадает с рецептом</li>
              <li><strong>Рецепты-добавки</strong>: соусы и другие сопровождения (тег <code>add-on</code>) не появляются в слотах плана, но их можно указывать как «ссылку-ингредиент» в других рецептах</li>
              <li><strong>Умный список закупки</strong>: ингредиенты агрегируются во вкладке «Закупка» и группируются по категориям (овощи, белок, молочное, бобовые, крупы, прочее); ингредиенты-ссылки (например, порция тахинного соуса) исключаются из списка</li>
              <li><strong>PDF на неделю</strong>: скачай план и все рецепты одним файлом — открывай на телефоне прямо на кухне</li>
              <li><strong>Фильтрация по тегам</strong>: обед, завтрак/ужин, перекус, без мяса, богато железом и другие</li>
            </ul>
            <h3 style={sectionTitle}>Философия</h3>
            <p style={{ ...bodyText, fontStyle: "italic", opacity: 0.75 }}>Если продукт качественный и свежий, добавки и специи ему не нужны.</p>
            <p style={bodyText}>Минимум готовки (большинство рецептов ≤ 10 минут), минимум ингредиентов, акцент на свежие и качественные продукты. Крупы и белок готовятся в рисоварке или на плите, свежие овощи добавляются перед едой.</p>
            <h3 style={sectionTitle}>Структура рецептов</h3>
            <ul style={{ fontSize: 14, paddingLeft: 18, margin: 0, lineHeight: 1.8 }}>
              <li>Название, эмодзи-иконка, тип (тёплый боул, холодный боул, лапша, смузи, соус)</li>
              <li>Теги для фильтрации (например, <code>lunch</code>, <code>snack</code>, <code>meat-free</code>, <code>add-on</code>)</li>
              <li>Количество порций и дней хранения (batch)</li>
              <li>Время подготовки и готовки</li>
              <li>КБЖУ на порцию — <em>очень грубая оценка, не полагайтесь на неё</em></li>
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
            <h3 style={sectionTitle}>Features</h3>
            <ul style={{ fontSize: 14, paddingLeft: 18, margin: 0, lineHeight: 1.8 }}>
              <li><strong>{meals.length} recipes</strong> ({mealCount} meals{addOnCount > 0 ? ` + ${addOnCount} add-on sauce${addOnCount === 1 ? "" : "s"}` : ""}) with step-by-step instructions and tips</li>
              <li><strong>Weekly planner</strong>: breakfast, lunch, dinner, and snack for each day</li>
              <li><strong>Batch cooking</strong>: dishes for 2–3 days automatically fill the following days</li>
              <li><strong>Batch validation</strong>: warnings when portion counts do not match the recipe</li>
              <li><strong>Add-on recipes</strong>: sauces and other extras (tagged <code>add-on</code>) don't show up in plan slots but can be referenced from other recipes as a "reference ingredient"</li>
              <li><strong>Smart shopping list</strong>: ingredients are aggregated on the Shopping tab and grouped by category (produce, protein, dairy, legumes, grains, pantry); reference ingredients (like a tahini-sauce portion) are excluded so you only see what to actually buy</li>
              <li><strong>Downloadable PDF</strong>: export the weekly plan and all recipes as a single file — open it on your phone right in the kitchen</li>
              <li><strong>Tag filtering</strong>: lunch, breakfast/dinner, snack, meat-free, iron-rich, and more</li>
            </ul>
            <h3 style={sectionTitle}>Philosophy</h3>
            <p style={{ ...bodyText, fontStyle: "italic", opacity: 0.75 }}>If the product is high quality and fresh, it does not need additives or spices.</p>
            <p style={bodyText}>Minimal cooking (most recipes take ≤ 10 minutes), minimal ingredients, focus on fresh, quality products. Grains and protein are cooked in a rice cooker or on the stove; fresh vegetables are added before eating.</p>
            <h3 style={sectionTitle}>Recipe Structure</h3>
            <ul style={{ fontSize: 14, paddingLeft: 18, margin: 0, lineHeight: 1.8 }}>
              <li>Name, emoji icon, type (warm bowl, cold bowl, noodles, smoothie, sauce)</li>
              <li>Tags for filtering (e.g. <code>lunch</code>, <code>snack</code>, <code>meat-free</code>, <code>add-on</code>)</li>
              <li>Servings and storage days (batch)</li>
              <li>Prep and cook time</li>
              <li>Macros per serving — <em>very rough estimate, do not rely on it</em></li>
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
