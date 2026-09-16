# 🍽️ PlatePal

A social calorie tracker. **Snap a meal → AI predicts the name, serving size &
calories → it's logged and shared to the friends in your tracker circle, who get
a push notification.** The feed mixes your friends' meals with dietary meal-prep
articles, and **Chef**, a witty AI food buddy, roasts your day and gives tips.

Built with **Expo (React Native) · Supabase · OpenAI (gpt-4o-mini)**.

---

## ✨ Features

| Area | What it does |
|------|--------------|
| 📸 **Snap & log** | Camera → OpenAI vision estimates meal name, serving, calories + macros. Everything stays editable before you save. |
| 📊 **Tracker** | Animated calorie ring, macro bars, 7-day chart, per-day meal list, streaks. |
| 🎯 **Set goal** | BMR/TDEE calculator (lose / maintain / gain) computes calorie + macro targets. |
| 🧑‍🍳 **Talk to Chef** | AI chat buddy that jokes about your meals & plan while sneaking in real advice. |
| 🤖 **Custom AI persona** | Design your own AI by prompt (name + emoji + personality). It auto-comments on your meal posts in character, writes captions, and gives its "take" on any post on demand. Presets included (Chef Gordon, Gym Bro, Nonna…). |
| 👥 **Social** | Every meal is a post. Add friends, like & comment, real-time feed. |
| 🔔 **Tracker circle** | Add friends to your circle — they get a push every time you log a meal. |
| ☁️ **Cloud storage** | Meal photos are uploaded to Supabase Storage (`meal-photos` bucket). |

Design uses the brand palette: coral `#FF7F50` · yellow `#FFD166` · green `#06D6A0` · blue `#118AB2`.

---

## 🚀 Setup

### 1. Install

```bash
npm install
cp .env.example .env      # then fill in the values (see below)
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql).
   It creates all tables, RLS policies, triggers, the `meal-photos` storage
   bucket, and helper functions.
   *Already have an older database?* Run
   [`supabase/migrations/20260916120000_ai_persona.sql`](supabase/migrations/20260916120000_ai_persona.sql)
   instead to add the AI-persona columns without a reset (it's idempotent).
3. Copy **Project URL** and the **publishable key** (`sb_publishable_...`, from
   Project Settings → API Keys) into `.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=...
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
   *(On an older project you can use the legacy anon key in the same slot.)*

### 3. Edge functions (OpenAI + push)

```bash
npm i -g supabase                 # if you don't have the CLI
supabase login
supabase link --project-ref YOUR_REF

# secret: only the OpenAI key is required (never shipped to the app)
supabase secrets set OPENAI_API_KEY=sk-...
# NOTE: send-notification needs a service key to read push tokens, but Supabase
# auto-injects one (SUPABASE_SERVICE_ROLE_KEY) into every function — so you set
# nothing. To use the new secret key instead: supabase secrets set SB_SECRET_KEY=sb_secret_...

supabase functions deploy analyze-meal      # meal photo → nutrition
supabase functions deploy coach-chat        # the "Chef" AI buddy
supabase functions deploy ai-persona        # the user's custom AI persona
supabase functions deploy send-notification --no-verify-jwt  # Expo push (called by DB webhook)
```

Then wire push delivery: **Dashboard → Database → Webhooks → Create**
- Table `notifications`, event **INSERT**
- Type **Supabase Edge Function → `send-notification`**

Now every row a trigger inserts into `notifications` (new meal, like, comment,
added-to-circle) fans out as a real push to the recipient's device.

### 4. Photo storage

Nothing to configure — running [`schema.sql`](supabase/schema.sql) creates the
public `meal-photos` bucket and its access policies. Meal photos and avatars are
uploaded straight to Supabase Storage from the app ([`src/lib/storage.ts`](src/lib/storage.ts)).

### 5. Run

```bash
npx expo start
```

Open in **Expo Go** or a dev build. **Push notifications require a physical
device** (and, for a standalone build, an EAS `projectId`).

---

## 🏗️ Architecture

```
app/                       # expo-router screens (file-based routing)
  (auth)/                  # sign-in, onboarding
  (tabs)/                  # feed, track, capture, friends, profile, notifications
  log/[id].tsx             # meal detail + comments
  coach.tsx                # AI Chef chat (modal)
  goals.tsx                # goal calculator (modal)
  ai-persona.tsx           # design your custom AI persona (modal)
src/
  components/              # Avatar, CalorieRing, LogCard, TabBar, ... (all animated)
  context/AuthContext.tsx  # session + profile + push registration
  lib/                     # supabase, api, mealAnalysis, storage, coach, persona, goals, notifications
  theme/                   # palette + spacing/radius/typography tokens
supabase/
  schema.sql               # tables, RLS, triggers, storage
  functions/               # analyze-meal, coach-chat, ai-persona, send-notification (Deno)
```

**Why edge functions?** The OpenAI key never touches the client — the app sends
the photo (or chat) to a Supabase function that calls OpenAI server-side.

**Animations** use `react-native-reanimated`: spring press feedback, staggered
list entrances, the animated calorie ring & weekly bars, the like-heart pop, the
typing indicator, the scanning pulse during analysis, and a rotating capture FAB.

---

## 📝 Notes & next steps

- `daily_totals` / `feed_logs` are SQL helpers; the feed relies on RLS so a user
  only ever sees their own + accepted friends' logs.
- Streaks: the `streak_count` column is ready; add a scheduled function (or
  update on log insert) to increment it — left as a follow-up.
- Type safety: the Supabase client is untyped for brevity; run
  `supabase gen types typescript` and drop the result into `src/types` to make
  every query fully typed.
