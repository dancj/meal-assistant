# Meal Assistant

Automatically generate a weekly meal plan (5 dinners + grocery list) from your household's recipes and deliver it via email — all using free-tier services.

## Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org) (App Router) + React 19 + TypeScript
- **Hosting:** [Vercel](https://vercel.com) (free tier)
- **Database:** [Supabase](https://supabase.com) (Postgres, free tier) — recipe storage
- **AI:** [Google Gemini](https://ai.google.dev) (free tier) — meal plan generation
- **Email:** [Resend](https://resend.com) (free tier) — meal plan delivery
- **Automation:** GitHub Actions (weekly cron + manual trigger)
- **Styling:** Tailwind CSS v4

## How It Works

1. A GitHub Action triggers weekly (or you trigger manually / on-demand).
2. It calls the Vercel-hosted API route `POST /api/generate-plan`.
3. The API fetches your recipes from Supabase.
4. Recipes and dietary preferences are sent to Google Gemini, which returns a structured JSON meal plan: 5 dinners for Mon–Fri plus a consolidated grocery list.
5. The plan is automatically emailed to your household via Resend.

## Features

- **Recipe Management** — Add, edit, delete, and browse recipes through the web UI. Search by name and filter by tags.
- **AI Meal Planning** — Gemini selects 5 varied dinners from your recipe pool, respecting dietary preferences.
- **Dietary Preferences** — Pass household-level or per-person dietary constraints (e.g., "no shellfish", "kid: vegetarian alternative"). See [Dietary Preferences](#dietary-preferences) below.
- **Grocery List** — Auto-generated, deduplicated grocery list combining ingredients from all selected recipes.
- **Email Delivery** — Formatted HTML email with dinner cards and grocery checklist.
- **Automated Schedule** — Weekly GitHub Actions cron job, plus manual trigger from GitHub UI.

## NanoClaw Integration

Meal Assistant exposes a REST API for [NanoClaw](https://github.com/dancj/nanoclaw) (personal assistant bot) to add recipes from email, search the recipe library, and fetch the weekly meal plan.

- **[Setup Guide](docs/nanoclaw-setup.md)** — Authentication, core workflows, field mapping, and error handling
- **[API Reference](docs/api.md)** — Full endpoint documentation with request/response schemas and curl examples

## Getting Started

1. Clone the repository:
    ```bash
    git clone https://github.com/dancj/meal-assistant.git
    cd meal-assistant
    ```
2. Install dependencies:
    ```bash
    npm install
    ```
3. Create a `.env.local` file (see `.env.example`):
    ```env
    SUPABASE_URL=your-supabase-project-url
    SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
    GEMINI_API_KEY=your-gemini-api-key
    RESEND_API_KEY=your-resend-api-key
    EMAIL_FROM=onboarding@resend.dev
    EMAIL_RECIPIENTS=you@example.com
    CRON_SECRET=a-random-secret-string
    DIETARY_PREFERENCES="No shellfish. Kid: vegetarian alternative, fallback to pasta."
    ```
4. Run the development server:
    ```bash
    npm run dev
    ```
5. Open [http://localhost:3000](http://localhost:3000) to manage recipes and view the app.
6. Deploy to Vercel for production.

## Dietary Preferences

Dietary preferences are passed as a plain-text string to the Gemini prompt during meal plan generation. There are two ways to set them:

### Via environment variable (recommended for automated runs)

Set `DIETARY_PREFERENCES` in your `.env.local` (or Vercel environment variables):

```env
DIETARY_PREFERENCES="No shellfish. Kid: vegetarian alternative, fallback to pasta."
```

This is used automatically by the GitHub Actions cron job and as the default when no preferences are provided in the API call.

### Via API request body

When calling `POST /api/generate-plan`, you can pass preferences in the request body to override the default:

```json
{
  "preferences": "No red meat this week. Extra vegetables."
}
```

If neither is provided, the meal plan is generated with no dietary restrictions.

> **Tip:** Preferences are free-form text (max 500 characters). You can include household-level rules, per-person constraints, or weekly overrides. Gemini interprets them contextually.

> **Note:** Resend's free tier sends from `onboarding@resend.dev`, which only delivers to the account owner's email. To send to other household members, [verify a custom domain](https://resend.com/docs/dashboard/domains/introduction) in Resend.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the [MIT License](LICENSE).
