
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
=======
# Conversational Google Calendar Booking Bot

This is an AI-powered calendar booking assistant using FastAPI, LangGraph, Streamlit, and Gemini API.

## Features
- Conversational chat interface via Streamlit
- Google Calendar integration using a service account
- Check free/busy slots and create bookings

## Setup

1. Create a service account in Google Cloud Console.
2. Share your Google Calendar with the service account.
3. Put the JSON file `service_account.json`.
4. Add your `.env` file with GEMINI key and Calendar ID.

## Run Locally

```bash
cd backend
uvicorn main:app --reload
```

```bash
cd frontend
streamlit run app.py
```

## Example `.env`

```env
GEMINI_API_KEY=your_gemini_key_here
CALENDAR_ID=your_calendar_id@gmail.com
```

