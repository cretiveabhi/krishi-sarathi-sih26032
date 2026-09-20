# Krishi Sarathi — SIH26032 Prototype

A full-stack demo prototype for the Smart India Hackathon procurement live-tracking concept.

## Stack
- React + Vite frontend
- Node.js + Express backend
- SQLite database for the demo
- QR generation
- Farmer, Centre and Government views
- Smart centre scoring, split allocation, quota reservation
- Weather-triggered reallocation simulation
- Procurement event timeline

## Run locally

```bash
npm install
npm run build
npm start
```

Open the URL shown by the server (normally http://localhost:3000).

For development with Vite hot reload:

```bash
npm run dev
```

## Free deployment on Render

This project is prepared as a Render **Web Service**.

1. Upload/push this project to a GitHub repository.
2. In Render, choose **New → Web Service** and connect the repository.
3. Use:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Plan: **Free**
4. Deploy.
5. Render will provide a public `onrender.com` URL.

### Important demo note
The prototype intentionally simulates government/KYC/payment/weather integrations. SQLite is suitable for this SIH demonstration, but its local database is not persistent on Render's free web-service filesystem across restarts/redeploys.

## Main demo flow

1. Farmer tab → choose quantities across centres → Reserve Quota + Book Slots.
2. Centre tab → progress the procurement event timeline.
3. Farmer tab → refresh an allocation to see events.
4. Use **Simulate Centre B Weather Alert** to demonstrate weather risk and automatic reallocation to Centre D.
5. Government tab → show centre health, queue, quota and alerts.
