# FusionSolar API Client

A TypeScript/Node.js client for fetching energy flow data from Huawei FusionSolar portal using Puppeteer for authentication.

## 🏠 Home Assistant Add-on

**✅ Ready to use with Home Assistant!**

### Quick Install Guide:

#### 1. Install Mosquitto MQTT Broker
```
Settings → Add-ons → Add-on Store → Search "Mosquitto broker" → Install → Start
```

#### 2. Enable MQTT Integration
```
Settings → Devices & Services → MQTT should appear → Configure → Enable discovery → Submit
```

#### 3. Create MQTT User
```
Your Profile (bottom left) → Enable "Advanced Mode"
Settings → People → Users → ADD USER
  - Name: MQTT Client
  - Username: mqtt_user (NOT "homeassistant" or "addons")
  - Password: [create secure password]
```

#### 4. Add This Repository
```
Settings → Add-ons → Add-on Store → ⋮ menu → Repositories
Add: https://github.com/ihkawiss/fusion-solar-api-ha
```

#### 5. Install FusionSolar Add-on
```
Find "FusionSolar MQTT Bridge" in store → Install (takes 5-10 min)
```

#### 6. Configure & Start
```
Configuration tab:
  - fusionsolar_username: your.email@example.com
  - fusionsolar_password: your_password
  - mqtt_username: mqtt_user
  - mqtt_password: [password from step 3]
  - station_dn: NE=XXXXXXXXXXXX (find in FusionSolar URL)

Info tab → Enable "Start on boot" → START
```

#### 7. Find Your Sensors
```
Developer Tools → States → Search "sensor.solar_"
```

📖 **Detailed instructions:** [fusionsolar/DOCS.md](./fusionsolar/DOCS.md)

### What you get:

- 📊 6 sensors automatically discovered in Home Assistant
- ☀️ Real-time solar production, consumption, grid, and battery data  
- 🔄 Auto-updates every minute (configurable)
- 🔐 Secure Puppeteer-based authentication
- 🚀 Easy installation and configuration

### Sensors Created:

- `sensor.solar_electrical_load` - Household consumption (kW)
- `sensor.solar_production` - Solar generation (kW)
- `sensor.grid_import` - Grid power import (kW)
- `sensor.battery_power` - Battery charge/discharge (kW)
- `sensor.battery_state_of_charge` - Battery level (%)
- `sensor.battery_mode` - Operating mode
- `sensor.exceeding_power` - Surplus power available (kW) - **NEW!**
  - Shows excess solar production (always 0 or positive)
  - 0 kW = No surplus (consuming all or more than producing)
  - >0 kW = Surplus available for charging, heating, etc.

---

## Standalone Usage

For running outside of Home Assistant (manual installation):

## Features

- **Puppeteer-based login** - Handles complex login flows automatically
- **MQTT Integration** - Publishes data to Home Assistant via MQTT
- Automatic session management with cookie persistence
- Automatic re-authentication when session expires
- Configurable polling interval
- Fetches energy flow data from your solar station
- Headless or visible browser mode for debugging

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Edit `.env` and add your FusionSolar credentials:
```
FUSIONSOLAR_USERNAME=your_email_or_username
FUSIONSOLAR_PASSWORD=your_password
POLL_INTERVAL_MINUTES=1
STATION_DN=NE=XXXXXXXXXXXX

# Optional: MQTT for Home Assistant
MQTT_HOST=localhost
MQTT_PORT=1883
MQTT_USERNAME=homeassistant
MQTT_PASSWORD=mqtt_password

# Optional: Set to false to see the browser during login (for debugging)
# HEADLESS=false
```

## Usage

### Development mode (with ts-node):
```bash
npm run dev
```

### Production mode:
```bash
npm run build
npm start
```

## How it works

1. The script uses **Puppeteer** to automate the browser and handle the login process
2. After successful login, cookies are saved to `cookies.json`
3. On subsequent runs, it reuses the saved cookies to avoid logging in again
4. If the session expires, it automatically logs in again using Puppeteer
5. Once authenticated, it fetches energy flow data from the configured station using axios
6. Data is fetched at regular intervals (default: every 1 minute)

## Configuration

- `FUSIONSOLAR_USERNAME`: Your FusionSolar login username/email
- `FUSIONSOLAR_PASSWORD`: Your FusionSolar password
- `POLL_INTERVAL_MINUTES`: How often to fetch data (in minutes, default: 1)
- `STATION_DN`: Your station device identifier (e.g., `NE=XXXXXXXXXXXX`)
- `HEADLESS`: Set to `false` to see the browser during login (useful for debugging, default: `true`)
- `MQTT_HOST`: MQTT broker address (optional, for Home Assistant integration)
- `MQTT_PORT`: MQTT broker port (default: 1883)
- `MQTT_USERNAME`: MQTT username (optional)
- `MQTT_PASSWORD`: MQTT password (optional)

## Output

The script outputs solar system metrics in a clean format:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 SOLAR SYSTEM METRICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏠 Electrical Load (Household): 0.471 kW
☀️  Solar Production: 0.000 kW
⚡ Grid Import: 0.471 kW
🔋 Battery: 0.000 kW (SOC: 5.0%)
   Mode: Maximum self-consumption
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### MQTT Integration

When MQTT is configured, the following sensors are published to Home Assistant:
- `sensor.solar_electrical_load` - Household consumption
- `sensor.solar_production` - Solar generation
- `sensor.grid_import` - Grid power import
- `sensor.battery_power` - Battery charge/discharge
- `sensor.battery_state_of_charge` - Battery SOC (%)
- `sensor.battery_mode` - Battery operating mode

You can also modify `src/index.ts` to:
- Save data to a file or database
- Send notifications
- Process the data in custom ways

## Notes

- Uses Puppeteer to handle complex login flows (CSRF tokens, JavaScript, etc.)
- Cookies are saved in `cookies.json` for session persistence
- The script automatically handles session expiration and re-login
- Set `HEADLESS=false` in `.env` to see the browser in action (helpful for debugging)
- On first run, Puppeteer will download Chromium automatically
- Press Ctrl+C to stop the script gracefully
