This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Configuration

Before running the app, you need to set up your Linear API key:

1. Create a `.env.local` file in the root directory
2. Add your Linear API key to the file:
   ```
   LINEAR_API_KEY=your_api_key_here
   ```
3. You can get an API key from [Linear's developer settings](https://linear.app/settings/api)

## Linear SDK Integration

This project uses the official Linear TypeScript SDK to interact with the Linear API. The SDK provides strongly typed models and operations for all Linear resources.

We've followed these patterns:
- Proper Linear client initialization with API key
- Typed query parameters for fetching data
- Async/await patterns for handling promises
- Error handling for API calls

## TypeScript Configuration

We've configured TypeScript to work with both Next.js and the Linear SDK:

- `noImplicitAny: false` - This aligns with Linear SDK patterns which sometimes use flexible typing
- Custom type definitions for Next.js App Router page props
- Type checking runs during build but doesn't block deployment
- ESLint is configured to allow patterns used by Linear SDK

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