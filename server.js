const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
const BLYNK_TOKEN = process.env.BLYNK_AUTH_TOKEN;
const BLYNK_BASE = process.env.BLYNK_BASE_URL || "https://blynk.cloud";

if (!BLYNK_TOKEN) {
  console.warn("WARNING: Set BLYNK_AUTH_TOKEN in your hosting environment.");
}

async function blynkGet(pin) {
  const url = `${BLYNK_BASE}/external/api/get?token=${encodeURIComponent(BLYNK_TOKEN)}&${encodeURIComponent(pin)}`;
  const response = await fetch(url);
  const body = await response.text();
  if (!response.ok) throw new Error(`Blynk read failed for ${pin}: ${response.status} ${body}`);
  const value = Number(String(body).trim().replace(/^"|"$/g, ""));
  if (!Number.isFinite(value)) throw new Error(`Invalid value from Blynk for ${pin}: ${body}`);
  return value;
}

async function blynkUpdate(pin, value) {
  const url = `${BLYNK_BASE}/external/api/update?token=${encodeURIComponent(BLYNK_TOKEN)}&${encodeURIComponent(pin)}=${encodeURIComponent(value)}`;
  const response = await fetch(url);
  const body = await response.text();
  if (!response.ok) throw new Error(`Blynk update failed for ${pin}: ${response.status} ${body}`);
  return body;
}

app.get("/api/status", async (req, res) => {
  try {
    const [temperature, humidity, moisture, pump, mode] = await Promise.all([
      blynkGet("V0"),
      blynkGet("V1"),
      blynkGet("V3"),
      blynkGet("V12"),
      blynkGet("V13").catch(() => 0)
    ]);
    res.json({
      temperature, humidity, moisture,
      pump: pump ? 1 : 0,
      mode: mode ? "auto" : "manual",
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Blynk data could not be read. Check token, datastreams and device connection." });
  }
});

app.post("/api/mode", async (req, res) => {
  try {
    const mode = req.body && req.body.mode;
    if (mode !== "auto" && mode !== "manual") {
      return res.status(400).json({ error: "mode must be 'auto' or 'manual'" });
    }
    await blynkUpdate("V13", mode === "auto" ? 1 : 0);
    if (mode === "manual") await blynkUpdate("V12", 0);
    res.json({ ok: true, mode });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Could not change mode. Check Blynk token and V13 datastream." });
  }
});

app.post("/api/pump", async (req, res) => {
  try {
    const state = req.body && req.body.state;
    if (state !== 0 && state !== 1 && state !== false && state !== true) {
      return res.status(400).json({ error: "state must be 0 or 1" });
    }
    // Read current mode from Blynk; only allow manual pump commands in manual mode.
    let mode = 0;
    try { mode = await blynkGet("V13"); } catch (_) { mode = 0; }
    if (mode) return res.status(409).json({ error: "Switch to Manual mode before controlling the pump manually." });
    await blynkUpdate("V12", Number(state) ? 1 : 0);
    res.json({ ok: true, pump: Number(state) ? 1 : 0 });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Pump command failed. Check Blynk device connection." });
  }
});

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => console.log(`Smart Plant dashboard running on port ${PORT}`));
