/**
 * The onboarding tours.
 *
 * A step is an anchor (`target`, matched against a `data-tour` attribute), a side
 * of it to sit on, and a way out. Text lives in i18n under
 * `tour.<tourId>.<stepId>.title` / `.body`.
 *
 * `advance: "appear"` is the whole reason this is a tour and not a slideshow: the
 * step ends by itself once the *next* anchor turns up. The tour never opens the
 * picker or plants a demo dish — it says "press this" and waits for the user to
 * press it, so whatever ends up in the plan is genuinely theirs. "Turns up" means
 * newly, not already there, so a step never skips itself on a screen that happens
 * to be one click ahead.
 *
 * A target that is missing for longer than a moment drops its step (see
 * `TourContext`), which is what makes conditional anchors safe to list: the
 * amount field only exists once the picker is showing products, and the tour
 * walks past it when it is not.
 */

export const TOUR_WEEK = "week";
export const TOUR_SHOPPING = "shopping";
export const TOUR_RECIPES = "recipes";
export const TOUR_ACCOUNT = "account";

export const TOURS = {
  [TOUR_WEEK]: [
    { id: "tabs", target: "tabs", placement: "bottom" },
    { id: "addDish", target: "week-add-dish", placement: "bottom", advance: "appear" },
    { id: "sourceRecipes", target: "picker-recipes", placement: "bottom" },
    // Waits for the amount field, which is what switching to products produces.
    { id: "sourceProducts", target: "picker-products", placement: "bottom", advance: "appear" },
    { id: "amount", target: "picker-amount", placement: "left" },
    { id: "search", target: "picker-search", placement: "bottom" },
    { id: "tags", target: "picker-tags", placement: "bottom" },
    // No `appear` here: the add-on button may already exist from an earlier plan,
    // and jumping to it while the picker still covers it would point at nothing.
    // The picker closing takes the anchor away, which ends the step by itself.
    { id: "pickDish", target: "picker-list", placement: "top" },
    { id: "addOn", target: "week-add-addon", placement: "bottom" },
    // The PDF button exists only once something is planned, which by now it is.
    { id: "pdf", target: "week-pdf", placement: "bottom" },
    { id: "about", target: "about", placement: "bottom" },
  ],

  [TOUR_SHOPPING]: [
    { id: "pdf", target: "shopping-pdf", placement: "bottom" },
  ],

  [TOUR_RECIPES]: [
    { id: "filters", target: "recipes-filters", placement: "bottom" },
    { id: "openCard", target: "recipe-card", placement: "bottom", advance: "appear" },
    { id: "newTag", target: "dishtags-new", placement: "bottom" },
    { id: "editTags", target: "dishtags-edit", placement: "bottom" },
  ],

  [TOUR_ACCOUNT]: [
    { id: "products", target: "tab-products", placement: "bottom" },
    { id: "toRecipes", target: "tab-recipes", placement: "bottom", advance: "appear" },
    { id: "ownRecipe", target: "recipes-create", placement: "bottom" },
    { id: "backup", target: "account", placement: "bottom" },
  ],
};

/** Which tour a tab teaches — used both to offer it and to replay it. */
export const TAB_TOURS = {
  week: TOUR_WEEK,
  shopping: TOUR_SHOPPING,
  recipes: TOUR_RECIPES,
  products: TOUR_ACCOUNT,
};
