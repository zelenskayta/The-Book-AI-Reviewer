# The Book AI Script Reviewer — Vercel Edition

This version uses:

- `index.html` for the frontend
- `api/review.js` as a Vercel Function
- the official OpenAI JavaScript SDK
- a Vercel Environment Variable named `OPENAI_API_KEY`

## Deploy

1. Upload all files and the `api` folder to the root of your GitHub repository.
2. Import the repository into Vercel.
3. In Vercel Project Settings → Environment Variables, add:
   - Name: `OPENAI_API_KEY`
   - Value: your OpenAI API key
   - Environments: Production, Preview, Development
4. Redeploy after adding the variable.
5. Open `/health` on the deployed site. It should return:
   - `"ok": true`
   - `"api_key_configured": true`

## Important

Never put the API key in `index.html`, GitHub, README, or any public file.

## Files

- `index.html`
- `api/review.js`
- `package.json`
- `vercel.json`
- `.gitignore`
