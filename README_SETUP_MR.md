# IoT Smart Plant — Online Website Dashboard

This project provides a custom website for your ESP32 + Blynk Smart Plant project.

## Features
- Live Temperature (Blynk V0)
- Live Humidity (Blynk V1)
- Soil Moisture (Blynk V3)
- Pump status/control (Blynk V12)
- Manual/Automatic mode (additional Blynk V13)
- Responsive mobile and laptop layout
- Blynk Auth Token stays on the server, not in browser JavaScript

## Important
The website is a custom dashboard hosted online. It uses Blynk as the data bridge to the ESP32.
Do not put the Blynk Auth Token in `public/index.html` or share it publicly.
The Auth Token was previously shared in chat; rotate/regenerate it in Blynk Console before public deployment.

## Blynk setup
Keep/create these Datastreams:
- V0: Temperature, Double
- V1: Humidity, Double
- V3: Soil Moisture, Integer (0–100)
- V12: Pump state, Integer (0/1) or Switch
- V13: Mode, Integer (0 = Manual, 1 = Automatic)

The website needs V13 in addition to the user's existing pins. Create it as an Integer/Enum datastream with min 0, max 1, default 0.

## Deploy on Render (free service availability/terms can change)
1. Create a GitHub account if needed and make a new repository.
2. Upload `server.js`, `package.json`, and the `public` folder contents to the repository root.
3. In Render, create a new **Web Service** and connect the repository.
4. Build command: `npm install`
5. Start command: `npm start`
6. Add Environment Variable:
   - Key: `BLYNK_AUTH_TOKEN`
   - Value: your regenerated Blynk device Auth Token
7. Optional environment variable:
   - `BLYNK_BASE_URL` = `https://blynk.cloud`
8. Deploy. Open the Render URL to view your website.

## Run locally
Install Node.js 18 or newer, then in this folder:
```bash
npm install
```
Set environment variable `BLYNK_AUTH_TOKEN` (do not paste it into website code).
Windows PowerShell:
```powershell
$env:BLYNK_AUTH_TOKEN="YOUR_NEW_BLYNK_TOKEN"
npm start
```
Then open `http://localhost:3000`.

## ESP32 setup
- Keep using your existing Blynk ESP32 code.
- It must publish sensor values to V0, V1, V3.
- V12 is the pump state.
- Add a Blynk callback for V13 to switch Manual/Automatic mode.
- Use the ESP32 code provided in `ESP32_Smart_Plant_Blynk.ino`.

## Notes
- Blynk HTTP API calls are made from the server. The browser never receives the Auth Token.
- Automatic watering threshold is 30% ON and 60% OFF by default; calibrate the soil sensor.
- Confirm relay active level before connecting the pump.
- If your Blynk plan/device API does not support the external API endpoint, check Blynk Console/API documentation or adjust the backend.
