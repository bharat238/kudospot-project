# Deploying KudoSpot to Cloudflare Pages & Supabase
This guide outlines the exact, step-by-step sequence to deploy KudoSpot in a production environment using **Cloudflare Pages** for the React frontend and **Supabase** for the backend database and AI Edge Functions.

---

## Prerequisites
Before you begin, make sure you have created accounts on the following platforms:
1. [Cloudflare](https://dash.cloudflare.com/) (Frontend hosting)
2. [Supabase](https://supabase.com/) (Database, Auth, Storage, Edge Functions)
3. [Anthropic Claude Console](https://platform.anthropic.com/) (AI Rewrites, Case Studies, Social Posts)
4. [Resend](https://resend.com/) (Email approvals workflow)
5. [Razorpay](https://razorpay.com/) (Payments and plan upgrades)

---

## Step 1: Database Setup (Supabase)

Run all commands from the application directory, `kudospot-fixed/`.

**Use migration history; do not manually run the old seven-file list.** The repository now contains additional migrations for approval security, publication consent, plan limits and billing.

1. Back up the target database and validate the change on a separate staging project first.
2. Sign in and link the intended project:
   ```bash
   supabase login
   supabase link --project-ref your-project-ref-id
   ```
3. Compare local and remote migration history, then preview the SQL changes:
   ```bash
   supabase migration list --linked
   supabase db push --dry-run
   ```
4. Inspect the dry-run output and verify every pending migration before applying it. For a new, empty project, apply the full migration set with `supabase db push`.
5. For an existing project, **stop if history is missing, unexpected or out of sync**. Do not blindly push every file or reset the linked database. Reconcile migration history only after independently verifying which SQL changes already exist in the actual schema; use `supabase migration repair --status applied <version>` only for a migration proven to have already been applied.

Migrations are applied in timestamp order from `supabase/migrations/`. The five migrations dated 2026-10-20 add billing/payment records and constraints, harden approval-link policies, enforce plan resource limits, require publication consent and guard approval-token mutations. These need staging validation before production use.

## Step 2: Supabase Edge Functions Deployment

Deploy the functions from `kudospot-fixed/` after configuring the required secrets in Step 3:

```bash
supabase functions deploy approve-testimonial
supabase functions deploy backfill-analytics
supabase functions deploy create-razorpay-order
supabase functions deploy generate-case-study
supabase functions deploy generate-social-post
supabase functions deploy handle-approval
supabase functions deploy notify-owner
supabase functions deploy rewrite-testimonial
supabase functions deploy send-approval-email
supabase functions deploy submit-testimonial
supabase functions deploy verify-razorpay-payment
```

## Step 3: Add Edge Function Secrets (Supabase)
In the Supabase Dashboard, go to **Edge Functions** -> **Secrets** and add the following keys. This is critical; without these, AI rewrites, emails, and payments will fail.

| Secret Name | Description | Where to Obtain |
|-------------|-------------|-----------------|
| `ANTHROPIC_API_KEY` | Claude Sonnet model key | platform.anthropic.com -> API Keys |
| `RESEND_API_KEY` | Sending email updates | resend.com -> API Keys |
| `RAZORPAY_KEY_ID` | Razorpay Payment ID | dashboard.razorpay.com -> Settings -> API Keys |
| `RAZORPAY_KEY_SECRET` | Razorpay Secret Key | Same page as KEY_ID |
| `SITE_URL` | Your production app URL | e.g. `https://kudospot.io` or `https://kudospot.pages.dev` |

---

## Step 4: Deploy Frontend (Cloudflare Pages)
1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to **Workers & Pages** -> **Create Application** -> **Pages** -> **Connect to Git**.
2. Select your repository and click **Begin setup**.
3. Configure the build settings:
   - **Framework preset**: `Vite` (or `None`)
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Under **Environment variables (advanced)**, add the following variables:
   - `VITE_SUPABASE_URL`: Your Supabase Project API URL (found in Supabase Settings -> API)
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: Your Supabase Anon/Public Key (found in Supabase Settings -> API)
   - `VITE_SUPABASE_PROJECT_ID`: Your Supabase Project Reference ID
   - `NODE_VERSION`: `18` (forces Cloudflare to build using Node 18+)
5. Click **Save and Deploy**.

---

## Step 5: Post-Deployment Verification
Once the build completes and is live:
1. Verify that visiting the `kudospot.pages.dev` URL displays the homepage.
2. Sign up for a new account to test the Supabase auth flow.
3. Test creating a testimonial, submitting a feedback form, and requesting an AI Rewrite to verify connection to both Supabase and Anthropic.
