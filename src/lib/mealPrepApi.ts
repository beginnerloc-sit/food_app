import { config } from "./config";
import type { MealPrepArticle } from "@/types/meal";

const BASE = "https://api.spoonacular.com";

/**
 * Fetch dietary meal-prep recipes/articles for the news feed.
 * Uses Spoonacular's complexSearch. If no API key is configured we return a
 * small curated fallback set so the feed still looks alive in development.
 */
export async function fetchMealPrepArticles(
  query = "meal prep",
  diet?: string
): Promise<MealPrepArticle[]> {
  if (!config.mealPrepApiKey) return FALLBACK;

  const params = new URLSearchParams({
    apiKey: config.mealPrepApiKey,
    query,
    number: "12",
    addRecipeNutrition: "true",
    addRecipeInformation: "true",
    sort: "popularity",
  });
  if (diet) params.set("diet", diet);

  try {
    const res = await fetch(`${BASE}/recipes/complexSearch?${params}`);
    if (!res.ok) return FALLBACK;
    const data = await res.json();
    return (data.results ?? []).map(
      (r: any): MealPrepArticle => ({
        id: r.id,
        title: r.title,
        image: r.image,
        readyInMinutes: r.readyInMinutes,
        servings: r.servings,
        calories: Math.round(
          r.nutrition?.nutrients?.find((n: any) => n.name === "Calories")
            ?.amount ?? 0
        ),
        sourceUrl: r.sourceUrl,
        diets: r.diets,
        summary: r.summary,
      })
    );
  } catch {
    return FALLBACK;
  }
}

export const DIET_FILTERS = [
  "All",
  "High-Protein",
  "Vegetarian",
  "Vegan",
  "Keto",
  "Low-Carb",
  "Mediterranean",
] as const;

export function dietQuery(filter: string): { query: string; diet?: string } {
  switch (filter) {
    case "High-Protein":
      return { query: "high protein meal prep" };
    case "Vegetarian":
      return { query: "meal prep", diet: "vegetarian" };
    case "Vegan":
      return { query: "meal prep", diet: "vegan" };
    case "Keto":
      return { query: "keto meal prep", diet: "ketogenic" };
    case "Low-Carb":
      return { query: "low carb meal prep" };
    case "Mediterranean":
      return { query: "mediterranean meal prep" };
    default:
      return { query: "healthy meal prep" };
  }
}

// Shown when no Spoonacular key is configured (development-friendly).
const FALLBACK: MealPrepArticle[] = [
  {
    id: -1,
    title: "5-Day High-Protein Chicken Meal Prep",
    image:
      "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&q=80",
    readyInMinutes: 45,
    servings: 5,
    calories: 480,
    diets: ["high-protein"],
    summary:
      "Grilled chicken, brown rice and roasted veggies portioned for the week.",
  },
  {
    id: -2,
    title: "Vegan Buddha Bowls for the Week",
    image:
      "https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=800&q=80",
    readyInMinutes: 30,
    servings: 4,
    calories: 420,
    diets: ["vegan"],
    summary: "Quinoa, chickpeas, kale and tahini dressing — plant-powered.",
  },
  {
    id: -3,
    title: "Keto Breakfast Egg Muffins",
    image:
      "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=800&q=80",
    readyInMinutes: 25,
    servings: 6,
    calories: 210,
    diets: ["ketogenic"],
    summary: "Grab-and-go egg muffins with spinach, cheese and bacon.",
  },
  {
    id: -4,
    title: "Mediterranean Mason Jar Salads",
    image:
      "https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=800&q=80",
    readyInMinutes: 20,
    servings: 4,
    calories: 350,
    diets: ["mediterranean"],
    summary: "Layered salads that stay fresh for days in the fridge.",
  },
];
