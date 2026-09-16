/**
 * Simple, transparent goal math. Uses the Mifflin-St Jeor equation for BMR,
 * an activity multiplier for TDEE, then a delta for the chosen objective.
 * This is an estimate for motivation — not medical advice.
 */

export type GoalType = "lose" | "maintain" | "gain";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "athlete";
export type Sex = "female" | "male";

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  athlete: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentary",
  light: "Lightly active",
  moderate: "Moderately active",
  active: "Very active",
  athlete: "Athlete",
};

export const GOAL_LABELS: Record<GoalType, string> = {
  lose: "Lose weight",
  maintain: "Maintain",
  gain: "Build muscle",
};

export interface GoalInputs {
  sex: Sex;
  age: number;
  weightKg: number;
  heightCm: number;
  activity: ActivityLevel;
  goalType: GoalType;
}

export interface GoalResult {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export function computeGoals(input: GoalInputs): GoalResult {
  const { sex, age, weightKg, heightCm, activity, goalType } = input;

  // BMR (Mifflin-St Jeor)
  const bmr =
    10 * weightKg +
    6.25 * heightCm -
    5 * age +
    (sex === "male" ? 5 : -161);

  const tdee = bmr * ACTIVITY_MULTIPLIER[activity];

  // Objective adjustment (~500 kcal/day toward a ~0.45 kg/week change).
  const delta = goalType === "lose" ? -500 : goalType === "gain" ? 300 : 0;
  const calories = Math.max(1200, Math.round((tdee + delta) / 10) * 10);

  // Macro split by goal.
  // protein g/kg, then fat 25% of calories, carbs fill the rest.
  const proteinPerKg = goalType === "gain" ? 2.0 : goalType === "lose" ? 1.8 : 1.6;
  const protein_g = Math.round(weightKg * proteinPerKg);
  const fat_g = Math.round((calories * 0.25) / 9);
  const carbCalories = calories - protein_g * 4 - fat_g * 9;
  const carbs_g = Math.max(0, Math.round(carbCalories / 4));

  return { calories, protein_g, carbs_g, fat_g };
}
