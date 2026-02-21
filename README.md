# Meal Assistant

Automatically generate a weekly meal plan (5 dinners + grocery list) from your own recipes and deliver it via email — all using free-tier services.

## Tech Stack

- **Frontend:** Next.js + React + TypeScript (hosted on Vercel, free tier)
- **Backend:** Next.js API routes (serverless)
- **Storage:** [Supabase](https://supabase.com) (Postgres, free tier)
- **AI Meal Planning:** [Google Gemini](https://ai.google.dev) (free tier)
- **Email Delivery:** [Resend](https://resend.com) (free tier)
- **Automation:** GitHub Actions (weekly cron schedule)

## How It Works

1. A GitHub Action triggers weekly (or you trigger on-demand).
2. It calls the Vercel-hosted API route `/api/generate-plan`.
3. The API fetches your recipes from Supabase.
4. Recipes and dietary preferences are sent to Google Gemini, which generates a 5-dinner meal plan with a consolidated grocery list.
5. The plan is emailed to your household via Resend.

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
3. Create a `.env.local` file (see `sample.env.local`):
    ```env
    SUPABASE_URL=your-supabase-project-url
    SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
    GEMINI_API_KEY=your-gemini-api-key
    RESEND_API_KEY=your-resend-api-key
    EMAIL_FROM=onboarding@resend.dev
    EMAIL_RECIPIENTS=you@example.com
    CRON_SECRET=a-random-secret-string
    ```
4. Run the development server:
    ```bash
    npm run dev
    ```
5. Deploy to Vercel for production.

> **Note:** Resend's free tier sends from `onboarding@resend.dev`, which only delivers to the account owner's email. To send to other household members, [verify a custom domain](https://resend.com/docs/dashboard/domains/introduction) in Resend.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the [MIT License](LICENSE).
