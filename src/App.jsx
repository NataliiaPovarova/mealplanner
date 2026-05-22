import { useState } from "react";
import { useTranslation } from "react-i18next";
import useRecipes from "./hooks/useRecipes";
import useWeekPlan from "./hooks/useWeekPlan";
import WeekPlanner from "./components/WeekPlanner";
import ShoppingList from "./components/ShoppingList";
import RecipeList from "./components/RecipeList";
import AboutOverlay from "./components/AboutOverlay";

function App() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState("week");
  const [showAbout, setShowAbout] = useState(false);
  const meals = useRecipes();
  const plan = useWeekPlan(meals);

  const filledSlots = Object.keys(plan.weekPlan).length;
  const toggleLang = () => i18n.changeLanguage(i18n.language === "ru" ? "en" : "ru");

  const tabs = [
    { id: "week", label: t("tabs.week"), icon: "📅" },
    { id: "shopping", label: `${t("tabs.shopping")}${filledSlots ? ` (${filledSlots})` : ''}`, icon: "🛒" },
    { id: "recipes", label: t("tabs.recipes"), icon: "📖" },
  ];

  return (
    <div style={{
      fontFamily: "'Georgia', 'Noto Serif', serif",
      maxWidth: 780, margin: "0 auto", padding: "24px 16px",
      color: "var(--text-color, #2d2a24)", lineHeight: 1.6,
    }}>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.02em" }}>{t("app.title")}</h1>
          <p style={{ fontSize: 14, opacity: 0.55, margin: 0, fontStyle: "italic" }}>{t("app.subtitle")}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0, marginLeft: 12, marginTop: 2 }}>
          <button
            onClick={toggleLang}
            title={i18n.language === "ru" ? "Switch to English" : "Переключить на русский"}
            style={{
              padding: "4px 10px", borderRadius: 16, fontSize: 12, fontFamily: "inherit", cursor: "pointer",
              border: "1.5px solid var(--text-color, #2d2a24)",
              background: "transparent", color: "var(--text-color, #2d2a24)",
              fontWeight: 600, transition: "all 0.15s ease", letterSpacing: "0.03em",
            }}
            onMouseOver={e => e.currentTarget.style.opacity = "0.65"}
            onMouseOut={e => e.currentTarget.style.opacity = "1"}
          >{i18n.language === "ru" ? "EN" : "РУ"}</button>
          <button
            onClick={() => setShowAbout(true)}
            title={t("app.about")}
            style={{
              width: 36, height: 36, borderRadius: "50%", border: "2px solid var(--text-color, #2d2a24)",
              background: "var(--text-color, #2d2a24)", color: "#fff",
              fontSize: 18, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "opacity 0.15s ease",
            }}
            onMouseOver={e => e.currentTarget.style.opacity = "0.75"}
            onMouseOut={e => e.currentTarget.style.opacity = "1"}
          >?</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1.5px solid var(--border-color, #e0dcd4)" }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "10px 16px", border: "none", background: "none", cursor: "pointer",
              fontSize: 13, fontFamily: "inherit",
              fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? "var(--text-color, #2d2a24)" : "var(--text-color-secondary, #8a8478)",
              borderBottom: activeTab === tab.id ? "2px solid var(--text-color, #2d2a24)" : "2px solid transparent",
              marginBottom: -1.5, transition: "all 0.15s ease",
            }}
          ><span style={{ marginRight: 5 }}>{tab.icon}</span>{tab.label}</button>
        ))}
      </div>

      {activeTab === "week" && <WeekPlanner plan={plan} meals={meals} />}
      {activeTab === "shopping" && <ShoppingList weekPlan={plan.weekPlan} getDayKBJU={plan.getDayKBJU} filledSlots={filledSlots} meals={meals} />}
      {activeTab === "recipes" && <RecipeList />}

      {showAbout && <AboutOverlay onClose={() => setShowAbout(false)} />}
    </div>
  );
}

export default App;
