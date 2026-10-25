#define BLYNK_PRINT Serial
#define BLYNK_TEMPLATE_ID "TMPL34lS7hmB0"
#define BLYNK_TEMPLATE_NAME "IOT Smart Plant"
#define BLYNK_AUTH_TOKEN "PUT_YOUR_NEW_BLYNK_AUTH_TOKEN_HERE"

#include <WiFi.h>
#include <BlynkSimpleEsp32.h>
#include <DHT.h>

#define DHTPIN 4
#define DHTTYPE DHT11
#define MOISTURE_PIN 34
#define RELAY_PIN 26

DHT dht(DHTPIN, DHTTYPE);
BlynkTimer timer;

char ssid[] = "YOUR_WIFI_NAME";
char pass[] = "YOUR_WIFI_PASSWORD";

const int dryValue = 3000;  // calibrate from Serial Monitor
const int wetValue = 1300;  // calibrate from Serial Monitor
const int RELAY_ON = LOW;   // change if your relay is active-HIGH
const int RELAY_OFF = HIGH;

bool autoMode = false;
bool pumpState = false;
int latestMoisture = 0;

void setPump(bool state) {
  pumpState = state;
  digitalWrite(RELAY_PIN, state ? RELAY_ON : RELAY_OFF);
  if (Blynk.connected()) Blynk.virtualWrite(V12, state ? 1 : 0);
  Serial.printf("Pump: %s\n", state ? "ON" : "OFF");
}

BLYNK_CONNECTED() {
  // Read saved mode and pump switch values when the device reconnects.
  Blynk.syncVirtual(V13, V12);
}

BLYNK_WRITE(V13) {
  autoMode = param.asInt() == 1;
  Serial.printf("Mode: %s\n", autoMode ? "AUTOMATIC" : "MANUAL");
  if (!autoMode) {
    // Switching to Manual starts with pump OFF for safety.
    setPump(false);
  }
}

BLYNK_WRITE(V12) {
  int requested = param.asInt();
  if (autoMode) {
    // Ignore manual commands in Automatic mode; moisture logic controls pump.
    Blynk.virtualWrite(V12, pumpState ? 1 : 0);
  } else {
    setPump(requested == 1);
  }
}

void readSensors() {
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();

  if (!isnan(humidity) && !isnan(temperature)) {
    Blynk.virtualWrite(V0, temperature);
    Blynk.virtualWrite(V1, humidity);
    Serial.printf("Temperature: %.1f C | Humidity: %.1f%%\n", temperature, humidity);
  } else {
    Serial.println("DHT11 read failed");
  }

  int raw = analogRead(MOISTURE_PIN);
  latestMoisture = constrain(map(raw, dryValue, wetValue, 0, 100), 0, 100);
  Blynk.virtualWrite(V3, latestMoisture);
  Serial.printf("Soil raw: %d | Moisture: %d%%\n", raw, latestMoisture);

  if (autoMode) {
    if (latestMoisture <= 30 && !pumpState) setPump(true);
    else if (latestMoisture >= 60 && pumpState) setPump(false);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, RELAY_OFF);
  analogReadResolution(12);
  dht.begin();

  Blynk.begin(BLYNK_AUTH_TOKEN, ssid, pass);
  timer.setInterval(2500L, readSensors);
}

void loop() {
  Blynk.run();
  timer.run();
}
