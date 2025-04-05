# 🍽️ Meal Planning Assistant (Automated Weekly Meal Planner)

## 🎯 Goal
Automatically generate a weekly meal plan using your own recipes and deliver it to you via email — all using free/low-cost tools.

---

## 🛠️ Tech Stack
- **Frontend**: Next.js + React + TypeScript (hosted on Vercel, free tier)  
- **Backend API Routes**: Serverless functions in Next.js  
- **Storage**: Recipes stored in Google Sheets  
- **AI Meal Planning**: OpenAI GPT-4 or GPT-3.5 via API  
- **Email Delivery**: Gmail API via Nodemailer  
- **Calendar Sync**: Google Calendar API (Skylight-compatible)  
- **Automation**: GitHub Actions scheduled weekly (e.g., every Sunday)  

---

## 🔄 Workflow
1. **Weekly Trigger**: A GitHub Action runs on a schedule (e.g., every Sunday).  
2. **API Call**: It triggers a Vercel-hosted API route (`/api/generate-plan`).  
3. **Meal Plan Generation**:  
    - Fetches recipes from Google Sheets.  
    - Sends them to OpenAI GPT to generate a meal plan.  
4. **Delivery**:  
    - Emails the plan to you via Gmail.   
5. **Result**: You receive your meal plan in your inbox!  

---

## 🚀 Getting Started
1. Clone the repository:  
    ```bash
    git clone https://github.com/your-username/meal-assistant.git
    cd meal-assistant
    ```
2. Install dependencies:  
    ```bash
    npm install
    ```
3. Set up environment variables in a `.env.local` file:  
    ```env
    GOOGLE_SHEETS_ID=<your-google-sheets-id>
    OPENAI_API_KEY=<your-openai-api-key>
    GMAIL_CLIENT_ID=<your-gmail-client-id>
    GMAIL_CLIENT_SECRET=<your-gmail-client-secret>
    GMAIL_REFRESH_TOKEN=<your-gmail-refresh-token>
    GOOGLE_CALENDAR_ID=<your-google-calendar-id>
    ```
4. Run the development server:  
    ```bash
    npm run dev
    ```
5. Deploy to Vercel for production.

---

## 🤝 Contributing
Contributions are welcome! Please open an issue with your ideas and/or submit a pull request with your improvements.

---

## 📜 License
This project is licensed under the [MIT License](LICENSE).

---  