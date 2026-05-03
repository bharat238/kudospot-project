# KudoSpot — Setup Guide
## Run locally in 10 minutes

---

## Step 1: Install dependencies

```bash
npm install
```

---

## Step 2: Environment variables

Your `.env` file is already configured with your Supabase project. You do NOT need to change it.

---

## Step 3: Add Supabase Edge Function Secrets

Go to: **Supabase Dashboard → Edge Functions → Secrets**

Add these one by one:

| Secret Name | Where to get it | Required? |
|-------------|----------------|-----------|
| `ANTHROPIC_API_KEY` | platform.anthropic.com → API Keys → Create Key | ✅ YES — all AI features need this |
| `RESEND_API_KEY` | resend.com → Dashboard → API Keys → Create Key | Optional — enables auto-emails |
| `RAZORPAY_KEY_ID` | dashboard.razorpay.com → Settings → API Keys | Optional — enables payments |
| `RAZORPAY_KEY_SECRET` | Same page as KEY_ID | Optional — enables payments |
| `SITE_URL` | Your Vercel domain e.g. https://kudospot.vercel.app | Optional — needed for email links |

---

## Step 4: Run the database migrations

Go to: **Supabase Dashboard → SQL Editor**

Run each migration file in order:
1. `supabase/migrations/20260421154612_*.sql`
2. `supabase/migrations/20260421164051_*.sql`
3. `supabase/migrations/20260421165706_*.sql`
4. `supabase/migrations/20260421165732_*.sql`
5. `supabase/migrations/20260421170714_*.sql`
6. `supabase/migrations/20260422033752_*.sql`
7. `supabase/migrations/20260423000000_final_fixes.sql`

---

## Step 5: Run locally

```bash
npm run dev
```

Open http://localhost:5173

---

## Step 6: Deploy to Vercel (free)

```bash
npm install -g vercel
vercel
```

Add these environment variables in Vercel dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

---

## What was fixed in this version

### 🔴 Critical fixes
- **All 3 AI edge functions** — switched from broken third-party gateway to Claude API (`claude-sonnet-4-6`)
- **Case study security bug** — added `.eq("user_id", user.id)` so users can't read others' testimonials
- **JSON parse failure** — case study generator now handles markdown code blocks in AI response

### ✅ New features added
- `send-approval-email` edge function — sends approval email via Resend API (graceful fallback to clipboard if no API key)
- `create-razorpay-order` edge function — creates Razorpay payment order
- `verify-razorpay-payment` edge function — verifies signature and upgrades plan
- `/upgrade` page — full Razorpay checkout UI with plan cards
- "Upgrade plan" link in sidebar
- **Collect page** — completely rebuilt with 3 tabs:
  - Collection Forms (existing, improved)
  - Email Sequences (new — create/edit 3-step drip templates)
  - Send Requests (new — manual + CSV bulk contact logging)

### Already working (from previous session)
- Onboarding wizard (3-step)
- Forgot password page
- Mobile responsive sidebar with Sheet drawer
- Google OAuth via Supabase auth
- Plan limits enforcement (`usePlanLimits` hook)
- Settings with Billing tab + usage stats
- Social post PNG download via html2canvas
- Atomic widget view/click counters via Postgres RPC

---

## Testing checklist

- [ ] Sign up → onboarding wizard appears → complete it
- [ ] Create a collection form → share link → submit as customer
- [ ] Go to Testimonials → add testimonial → click AI Rewrite → rewrite appears in <5 seconds
- [ ] Click "Send approval link" → approval email sent (check Resend dashboard) or link copied
- [ ] Go to /approve/:token → approve the testimonial
- [ ] Create a widget → copy embed code → paste in any HTML page
- [ ] Generate a case study from 2+ approved testimonials
- [ ] Generate a social post → click PNG to download
- [ ] Go to /upgrade → Razorpay popup appears
- [ ] Check Settings → Billing tab shows current plan and usage

---

## Supabase Storage

Make sure the `form-assets` bucket exists in Supabase Storage (it's created by migration #3).
If it doesn't exist, go to: Supabase → Storage → New bucket → name it `form-assets` → set to Public.
