import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { DIET_OPTIONS, dietLabels, type DietId } from "@/lib/personalization";

const KEY = "fac:dietary-prefs:v1";
const NOTES_KEY = "fac:dietary-prefs-notes:v1";
const PROFILE_KEY = "fac:food-restriction-profile:v2";
const PROFILE_EVENT = "fac:food-restrictions-updated";

const textList = z.array(z.string().trim().min(1).max(80)).max(50);
export const foodRestrictionProfileSchema = z.object({
  diets: textList.max(30),
  allergies: textList.max(30),
  dislikes: textList,
  favorite_cuisines: textList.max(30),
  medical_conditions: textList.max(30),
  cannot_eat: textList,
  fasting_requirements: textList.max(30),
  spice_level: z.number().int().min(0).max(5),
  household_size: z.number().int().min(1).max(20),
  notes: z.string().trim().max(1000),
});

export type FoodRestrictionProfile = z.infer<typeof foodRestrictionProfileSchema>;

export const EMPTY_FOOD_RESTRICTION_PROFILE: FoodRestrictionProfile = {
  diets: [], allergies: [], dislikes: [], favorite_cuisines: [],
  medical_conditions: [], cannot_eat: [], fasting_requirements: [],
  spice_level: 2, household_size: 2, notes: "",
};

const dietIds = new Set(DIET_OPTIONS.map((option) => option.id));
const unique = (values: string[], limit = 50) =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).slice(0, limit);

function asDietIds(values: string[]): DietId[] {
  return unique(values, 30).filter((value): value is DietId => dietIds.has(value as DietId));
}

function normalize(input: Partial<FoodRestrictionProfile>): FoodRestrictionProfile {
  return foodRestrictionProfileSchema.parse({
    ...EMPTY_FOOD_RESTRICTION_PROFILE,
    ...input,
    diets: unique(input.diets ?? [], 30),
    allergies: unique(input.allergies ?? [], 30),
    dislikes: unique(input.dislikes ?? []),
    favorite_cuisines: unique(input.favorite_cuisines ?? [], 30),
    medical_conditions: unique(input.medical_conditions ?? [], 30),
    cannot_eat: unique(input.cannot_eat ?? []),
    fasting_requirements: unique(input.fasting_requirements ?? [], 30),
  });
}

function readProfile(): FoodRestrictionProfile {
  if (typeof window === "undefined") return EMPTY_FOOD_RESTRICTION_PROFILE;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (raw) return normalize(JSON.parse(raw));
    const legacyPrefs = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return normalize({
      diets: Array.isArray(legacyPrefs) ? legacyPrefs : [],
      notes: window.localStorage.getItem(NOTES_KEY) ?? "",
    });
  } catch {
    return EMPTY_FOOD_RESTRICTION_PROFILE;
  }
}

function storeProfile(profile: FoodRestrictionProfile) {
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  window.localStorage.setItem(KEY, JSON.stringify(asDietIds(profile.diets)));
  window.localStorage.setItem(NOTES_KEY, profile.notes);
  window.dispatchEvent(new CustomEvent(PROFILE_EVENT));
}

function mergeProfiles(local: FoodRestrictionProfile, cloud: Partial<FoodRestrictionProfile>) {
  return normalize({
    ...local,
    ...cloud,
    diets: unique([...(local.diets ?? []), ...(cloud.diets ?? [])], 30),
    allergies: unique([...(local.allergies ?? []), ...(cloud.allergies ?? [])], 30),
    dislikes: unique([...(local.dislikes ?? []), ...(cloud.dislikes ?? [])]),
    favorite_cuisines: unique([...(local.favorite_cuisines ?? []), ...(cloud.favorite_cuisines ?? [])], 30),
    medical_conditions: unique([...(local.medical_conditions ?? []), ...(cloud.medical_conditions ?? [])], 30),
    cannot_eat: unique([...(local.cannot_eat ?? []), ...(cloud.cannot_eat ?? [])]),
    fasting_requirements: unique([...(local.fasting_requirements ?? []), ...(cloud.fasting_requirements ?? [])], 30),
    notes: cloud.notes?.trim() || local.notes,
  });
}

export function restrictionSummary(profile: FoodRestrictionProfile): string[] {
  return unique([
    ...dietLabels(asDietIds(profile.diets), profile.notes),
    ...profile.diets.filter((value) => !dietIds.has(value as DietId)).map((value) => `Special diet: ${value}`),
    ...profile.allergies.map((value) => `ALLERGY — never include: ${value}`),
    ...profile.cannot_eat.map((value) => `CANNOT EAT — never include: ${value}`),
    ...profile.medical_conditions.map((value) => `Health condition to accommodate (not medical advice): ${value}`),
    ...profile.fasting_requirements.map((value) => `Religious fasting requirement: ${value}`),
    ...profile.dislikes.map((value) => `Personal dislike — avoid when possible: ${value}`),
  ], 50);
}

export function useDietaryPrefs() {
  const [profile, setProfile] = useState<FoodRestrictionProfile>(() => readProfile());

  useEffect(() => {
    const refresh = () => setProfile(readProfile());
    // SSR starts with an empty profile; hydrate from this device immediately.
    refresh();
    const storage = (event: StorageEvent) => {
      if ([KEY, NOTES_KEY, PROFILE_KEY].includes(event.key ?? "")) refresh();
    };
    window.addEventListener("storage", storage);
    window.addEventListener(PROFILE_EVENT, refresh);

    let active = true;
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!active || !data.user) return;
      const { data: row } = await supabase.from("food_preferences").select("*").eq("user_id", data.user.id).maybeSingle();
      if (!active || !row) return;
      const merged = mergeProfiles(readProfile(), row);
      setProfile(merged);
      try { storeProfile(merged); } catch { /* local storage may be unavailable */ }
    });
    return () => {
      active = false;
      window.removeEventListener("storage", storage);
      window.removeEventListener(PROFILE_EVENT, refresh);
    };
  }, []);

  const persistLocal = useCallback((next: FoodRestrictionProfile) => {
    const safe = normalize(next);
    setProfile(safe);
    try { storeProfile(safe); } catch { /* local storage may be unavailable */ }
    return safe;
  }, []);

  const saveProfile = useCallback(async (next: FoodRestrictionProfile) => {
    const safe = persistLocal(next);
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { savedToProfile: false };
    const { error } = await supabase.from("food_preferences").upsert(
      { ...safe, user_id: data.user.id },
      { onConflict: "user_id" },
    );
    if (error) throw error;
    return { savedToProfile: true };
  }, [persistLocal]);

  const prefs = useMemo(() => asDietIds(profile.diets), [profile.diets]);
  const restrictions = useMemo(() => restrictionSummary(profile), [profile]);

  const toggle = useCallback((id: DietId) => {
    const current = readProfile();
    persistLocal({
      ...current,
      diets: current.diets.includes(id) ? current.diets.filter((value) => value !== id) : [...current.diets, id],
    });
  }, [persistLocal]);

  const clear = useCallback(() => persistLocal({ ...readProfile(), diets: [] }), [persistLocal]);
  const setNotes = useCallback((notes: string) => {
    persistLocal({ ...readProfile(), notes: notes.slice(0, 1000) });
  }, [persistLocal]);

  return { prefs, toggle, clear, notes: profile.notes, setNotes, profile, restrictions, saveProfile };
}