# WashEasee backend

Node.js API for WashEasee account authentication, persistent login sessions, saved pickup addresses, and pickup scheduling. It is separate from the React/Vite frontend in `wash_easee/app`.

## Local setup

1. Install a current Node.js LTS release.
2. In this folder, run `npm install`.
3. Copy `.env.example` to `.env` and fill in the values locally. Never commit `.env` or share its contents.
4. In MongoDB Atlas, allow your current development IP and create a database user with read/write access to the application database. Do not use an Atlas Admin user for the app.
5. Start the API with `npm run dev`. It listens on `http://localhost:4000` by default.

`MONGODB_URI` should include the database name `washeasee`. `SESSION_SECRET` must be a private random value of at least 32 characters. The session cookie is HTTP-only and sessions are stored in MongoDB, with a rolling 30-day expiry.

## Environment values

- `NODE_ENV`: `development` locally; set `production` on the backend host.
- `PORT`: server port, default `4000`.
- `MONGODB_URI`: Atlas connection string, kept only in the backend environment.
- `SESSION_SECRET`: private session signing secret.
- `FRONTEND_ORIGINS`: comma-separated exact frontend origins allowed to make credentialed requests. Local Vite default: `http://localhost:5173`.`r`n- `OPS_API_KEY`: private operator secret used to update real pickup status. Never expose it in browser code or chat.
- `COOKIE_SAME_SITE` and `COOKIE_SECURE`: local default is `lax` and `false`. For a frontend and API hosted on different sites, use HTTPS and configure `COOKIE_SAME_SITE=none` and `COOKIE_SECURE=true`.

## API

- `GET /api/health` — API and database connection state.
- `POST /api/auth/register` — `{ "name", "email", "password", "pickupAddress" }`; creates an account and signs it in.
- `POST /api/auth/login` — `{ "email", "password" }`; starts a persistent session.
- `GET /api/auth/me` — returns the signed-in user or `401`.
- `POST /api/auth/logout` — ends the session.
- `GET /api/account` — current account, subscription placeholder, and recent pickups.
- `PATCH /api/account/address` — `{ "pickupAddress" }`.
- `GET /api/account/pickups` — recent pickup schedules.
- `POST /api/account/pickups` — `{ "pickupDate": "YYYY-MM-DD", "pickupSlot": "morning|afternoon|evening", "clothesCount": 1 }`; pickup dates must be Saturdays.`r`n- `PATCH /api/operations/pickups/:pickupId/status` — operator-only `Authorization: Bearer <OPS_API_KEY>`; advances a pickup from scheduled to picked/washing and then delivered.

Browser requests from the frontend must include credentials so the HTTP-only session cookie is sent. The server never returns password hashes. New accounts start with an inactive subscription; payment processing and subscription activation are not implemented here.

## Before public deployment

Deploy this API on a Node.js host, set the environment variables in that host's private settings, set the production frontend origin, use HTTPS, and restrict Atlas network access to the backend host's supported outbound IPs where possible. Do not expose Atlas credentials in frontend code or in a public repository.


