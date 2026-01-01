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

## Development

To test locally or contribute:

```bash
cd fusionsolar
npm install
npm run dev
```

See [fusionsolar/DOCS.md](./fusionsolar/DOCS.md) for detailed development documentation.
