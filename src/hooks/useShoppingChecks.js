import { useState } from "react";

const STORAGE_KEY = "shopping-checked";

function loadChecked() {
  if (typeof localStorage === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveChecked(checked) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
  }
}

export function itemKey(ingredientId, unit) {
  return `${ingredientId}|${unit}`;
}

export default function useShoppingChecks() {
  const [checked, setChecked] = useState(loadChecked);

  const toggle = (key) => {
    setChecked((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = true;
      saveChecked(next);
      return next;
    });
  };

  const isChecked = (key) => !!checked[key];

  return { isChecked, toggle };
}
