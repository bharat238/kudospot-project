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
1. Go to the [Supabase Dashboard](https://supabase.com/dashboard) and click **New Project**.
2. Give your project a name (e.g., `kudospot-production`), select a strong database password, and choose a region close to your target audience.
3. Once the project is provisioned, navigate to the **SQL Editor** from the left-hand sidebar.
4. Click **New Query** and run the SQL migration files located in `supabase/migrations/` in chronological order:
   - Run `20260421154612_*.sql`
   - Run `20260421164051_*.sql`
   - Run `20260421165706_*.sql`
   - Run `20260421165732_*.sql`
   - Run `20260421170714_*.sql`
   - Run `20260422033752_*.sql`
   - Run `20260423000000_final_fixes.sql`
5. Go to **Storage** in the Supabase Sidebar, ensure that a bucket named `form-assets` exists and that its accessibility is set to **Public**. If not, create it manually.

---

## Step 2: Supabase Edge Functions Deployment
The AI-powered tools and backend services are handled via Supabase Edge Functions. You need to deploy these functions to your production Supabase project.

1. Install the Supabase CLI on your local machine:
   ```bash
   npm install -g supabase
   ```
2. Log in to your Supabase account via CLI:
   ```bash
   supabase login
   ```
3. Link your project by copying your Project Reference ID (found in project settings):
   ```bash
   supabase link --project-ref your-project-ref-id
   ```
4. Deploy the functions:
   ```bash
   supabase functions deploy backfill-analytics
   supabase functions deploy create-razorpay-order
   supabase functions deploy generate-case-study
   supabase functions deploy generate-social-post
   supabase functions deploy rewrite-testimonial
   supabase functions deploy send-approval-email
   supabase functions deploy verify-razorpay-payment
   ```

---

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
