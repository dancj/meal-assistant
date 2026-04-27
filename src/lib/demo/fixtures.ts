import type { Deal } from "@/lib/deals/types";
import type { MealLog } from "@/lib/log/types";
import type { MealPlan } from "@/lib/plan/types";
import type { Recipe } from "@/lib/recipes/types";

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "1";
}

/**
 * Returns DEMO_PLAN with meals rotated by a pseudo-random offset so that
 * regenerate/swap actions in the UI produce a visibly different plan even
 * though no LLM is being called. Grocery list is left intact.
 */
export function rotatedDemoPlan(): MealPlan {
  const offset = Math.floor(Math.random() * DEMO_PLAN.meals.length);
  if (offset === 0) return DEMO_PLAN;
  const rotated = [
    ...DEMO_PLAN.meals.slice(offset),
    ...DEMO_PLAN.meals.slice(0, offset),
  ];
  return { meals: rotated, groceryList: DEMO_PLAN.groceryList };
}

export const DEMO_RECIPES: Recipe[] = [
  {
    title: "Sheet-pan chicken thighs with broccoli",
    tags: ["dinner", "weeknight", "kid-friendly"],
    kidVersion: "plain chicken, no seasoning, broccoli on the side",
    content:
      "Roast at 425°F for 25 min. Toss thighs in olive oil, paprika, garlic.",
    filename: "sheet-pan-chicken.md",
  },
  {
    title: "Black bean tacos",
    tags: ["dinner", "vegetarian"],
    kidVersion: "plain tortilla with shredded cheese",
    content:
      "Sauté onion + cumin, add black beans, mash slightly. Serve in warm tortillas with avocado.",
    filename: "black-bean-tacos.md",
  },
  {
    title: "Spaghetti with meat sauce",
    tags: ["dinner", "kid-friendly", "freezer"],
    kidVersion: "buttered noodles, sauce on the side",
    content:
      "Brown ground beef with onion + garlic, add jarred marinara, simmer 15 min. Toss with pasta.",
    filename: "spaghetti-meat-sauce.md",
  },
  {
    title: "Salmon with rice and roasted carrots",
    tags: ["dinner", "fish"],
    kidVersion: null,
    content: "Bake salmon at 400°F for 12 min. Roast carrots tossed in honey + olive oil.",
    filename: "salmon-rice-carrots.md",
  },
  {
    title: "Sausage and white bean skillet",
    tags: ["dinner", "one-pan"],
    kidVersion: null,
    content: "Brown sausage, add white beans + diced tomatoes + spinach, simmer 10 min.",
    filename: "sausage-white-bean.md",
  },
  {
    title: "Chicken fried rice",
    tags: ["dinner", "leftover-friendly"],
    kidVersion: "plain rice with scrambled egg",
    content:
      "Cold rice in hot oil, scramble eggs, add diced chicken + frozen peas + soy sauce.",
    filename: "chicken-fried-rice.md",
  },
  {
    title: "Turkey chili",
    tags: ["dinner", "freezer", "kid-friendly"],
    kidVersion: "served plain with shredded cheese, no beans",
    content:
      "Brown turkey + onion, add tomatoes, beans, chili powder. Simmer 30 min.",
    filename: "turkey-chili.md",
  },
];

export const DEMO_DEALS: Deal[] = [
  {
    productName: "Boneless skinless chicken thighs",
    brand: "Signature Farms",
    salePrice: "$1.99/lb",
    regularPrice: "$3.99/lb",
    promoType: "sale",
    validFrom: "2026-04-23",
    validTo: "2026-04-29",
    store: "safeway",
  },
  {
    productName: "Atlantic salmon fillet",
    brand: "Wild Caught",
    salePrice: "$8.99/lb",
    regularPrice: "$12.99/lb",
    promoType: "sale",
    validFrom: "2026-04-23",
    validTo: "2026-04-29",
    store: "safeway",
  },
  {
    productName: "Italian sausage",
    brand: "Open Nature",
    salePrice: "Buy 1 Get 1",
    regularPrice: "$6.99",
    promoType: "bogo",
    validFrom: "2026-04-23",
    validTo: "2026-04-29",
    store: "safeway",
  },
  {
    productName: "Ground turkey",
    brand: "Kirkwood",
    salePrice: "$3.49/lb",
    regularPrice: "$4.99/lb",
    promoType: "sale",
    validFrom: "2026-04-24",
    validTo: "2026-04-30",
    store: "aldi",
  },
  {
    productName: "Black beans (15oz can)",
    brand: "Pueblo Lindo",
    salePrice: "3 for $2.50",
    regularPrice: "$0.99",
    promoType: "multi_buy",
    validFrom: "2026-04-24",
    validTo: "2026-04-30",
    store: "aldi",
  },
  {
    productName: "Broccoli crowns",
    brand: "Season's Choice",
    salePrice: "$1.49/lb",
    regularPrice: "$2.49/lb",
    promoType: "sale",
    validFrom: "2026-04-24",
    validTo: "2026-04-30",
    store: "aldi",
  },
];

export const DEMO_PLAN: MealPlan = {
  meals: [
    {
      title: "Sheet-pan chicken thighs with broccoli",
      kidVersion: "plain chicken, no seasoning, broccoli on the side",
      dealMatches: [
        {
          item: "chicken thighs",
          salePrice: "$1.99/lb",
          store: "Safeway",
        },
        {
          item: "broccoli",
          salePrice: "$1.49/lb",
          store: "Aldi",
        },
      ],
    },
    {
      title: "Black bean tacos",
      kidVersion: "plain tortilla with shredded cheese",
      dealMatches: [
        {
          item: "black beans",
          salePrice: "3 for $2.50",
          store: "Aldi",
        },
      ],
    },
    {
      title: "Salmon with rice and roasted carrots",
      kidVersion: null,
      dealMatches: [
        {
          item: "salmon",
          salePrice: "$8.99/lb",
          store: "Safeway",
        },
      ],
    },
    {
      title: "Turkey chili",
      kidVersion: "served plain with shredded cheese, no beans",
      dealMatches: [
        {
          item: "ground turkey",
          salePrice: "$3.49/lb",
          store: "Aldi",
        },
      ],
    },
    {
      title: "Sausage and white bean skillet",
      kidVersion: null,
      dealMatches: [
        {
          item: "Italian sausage",
          salePrice: "BOGO",
          store: "Safeway",
        },
      ],
    },
  ],
  groceryList: [
    {
      item: "Boneless skinless chicken thighs",
      quantity: "2 lb",
      store: "safeway",
      dealMatch: { salePrice: "$1.99/lb", validTo: "2026-04-29" },
    },
    {
      item: "Atlantic salmon fillet",
      quantity: "1.5 lb",
      store: "safeway",
      dealMatch: { salePrice: "$8.99/lb", validTo: "2026-04-29" },
    },
    {
      item: "Italian sausage",
      quantity: "1 lb",
      store: "safeway",
      dealMatch: { salePrice: "BOGO", validTo: "2026-04-29" },
    },
    {
      item: "Corn tortillas",
      quantity: "1 pack (12)",
      store: "safeway",
      dealMatch: null,
    },
    {
      item: "Ground turkey",
      quantity: "1 lb",
      store: "aldi",
      dealMatch: { salePrice: "$3.49/lb", validTo: "2026-04-30" },
    },
    {
      item: "Black beans",
      quantity: "3 cans",
      store: "aldi",
      dealMatch: { salePrice: "3 for $2.50", validTo: "2026-04-30" },
    },
    {
      item: "Broccoli crowns",
      quantity: "1.5 lb",
      store: "aldi",
      dealMatch: { salePrice: "$1.49/lb", validTo: "2026-04-30" },
    },
    {
      item: "Carrots",
      quantity: "1 lb",
      store: "aldi",
      dealMatch: null,
    },
    {
      item: "Yellow onion",
      quantity: "2 large",
      store: "aldi",
      dealMatch: null,
    },
    {
      item: "Cilantro",
      quantity: "1 bunch",
      store: "aldi",
      dealMatch: null,
    },
    {
      item: "Long-grain white rice",
      quantity: "2 lb",
      store: "costco",
      dealMatch: null,
    },
    {
      item: "Avocados",
      quantity: "4",
      store: "costco",
      dealMatch: null,
    },
    {
      item: "Sharp cheddar (block)",
      quantity: "1 lb",
      store: "costco",
      dealMatch: null,
    },
    {
      item: "Honey",
      quantity: "12 oz",
      store: "wegmans",
      dealMatch: null,
    },
    {
      item: "Diced tomatoes (28oz can)",
      quantity: "2 cans",
      store: "wegmans",
      dealMatch: null,
    },
    {
      item: "Cannellini beans (15oz can)",
      quantity: "2 cans",
      store: "wegmans",
      dealMatch: null,
    },
  ],
};

export const DEMO_LOGS: MealLog[] = [
  {
    week: "2026-04-13",
    cooked: ["Sheet-pan chicken thighs with broccoli", "Spaghetti with meat sauce"],
    skipped: ["Salmon with rice and roasted carrots"],
    skipReason: "ran out of time, did takeout",
  },
  {
    week: "2026-04-06",
    cooked: ["Chicken fried rice", "Black bean tacos", "Turkey chili"],
    skipped: [],
  },
  {
    week: "2026-03-30",
    cooked: ["Spaghetti with meat sauce", "Sausage and white bean skillet"],
    skipped: ["Sheet-pan chicken thighs with broccoli"],
    skipReason: "kid was sick",
  },
];
