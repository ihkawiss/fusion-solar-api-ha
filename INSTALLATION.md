# Installing FusionSolar Add-on on Home Assistant

## Prerequisites

1. Home Assistant running on your Raspberry Pi
2. Mosquitto broker add-on installed (for MQTT)
3. Your GitHub repository: `https://github.com/ihkawiss/fusion-solar-api-ha`

## Installation Steps

### Step 1: Install Mosquitto Broker (if not already installed)

1. In Home Assistant, go to **Settings** → **Add-ons** → **Add-on Store**
2. Search for "Mosquitto broker"
3. Click **Install**
4. Go to the **Configuration** tab and add a user (optional but recommended):
   ```yaml
   logins:
     - username: homeassistant
       password: your_secure_password
   ```
5. Go to **Info** tab → Enable "Start on boot" → Click **Start**

### Step 2: Add Custom Repository

1. Go to **Settings** → **Add-ons** → **Add-on Store**
2. Click the **⋮** (three dots) menu in the top right corner
3. Select **Repositories**
4. Add this URL:
   ```
   https://github.com/ihkawiss/fusion-solar-api-ha
   ```
5. Click **Add**
6. Close the dialog

### Step 3: Install FusionSolar Add-on

1. Scroll down in the Add-on Store
2. You should see "FusionSolar MQTT Bridge" under "Available add-ons"
3. Click on it
4. Click **Install** (this may take a few minutes)

### Step 4: Configure the Add-on

1. After installation, go to the **Configuration** tab
2. Fill in the required settings:

```yaml
fusionsolar_username: "your.email@example.com"
fusionsolar_password: "your_password"
mqtt_host: "core-mosquitto"
mqtt_port: 1883
mqtt_username: "homeassistant"
mqtt_password: "your_mqtt_password"
poll_interval_minutes: 1
station_dn: "NE=XXXXXXXXXXXX"
```

**To find your Station DN:**
1. Log into FusionSolar web portal: https://eu5.fusionsolar.huawei.com
2. Navigate to your plant
3. Look at the URL - it contains `stationDn=NE%3D123456789`
4. Use the part after `NE%3D` (or `NE=`), e.g., `NE=123456789`

### Step 5: Start the Add-on

1. Go to the **Info** tab
2. Enable "Start on boot" (recommended)
3. Enable "Watchdog" (recommended)
4. Click **Start**

### Step 6: Check Logs

1. Go to the **Log** tab
2. You should see:
   ```
   Starting FusionSolar API client...
   Connecting to MQTT broker...
   ✓ Connected to MQTT broker
   ✓ Published MQTT discovery messages
   ```

### Step 7: Verify Sensors in Home Assistant

1. Go to **Settings** → **Devices & Services** → **Devices**
2. Look for "FusionSolar System"
3. Click on it to see all sensors

Or check directly:
1. **Developer Tools** → **States**
2. Search for `sensor.solar_`

You should see:
- `sensor.solar_electrical_load`
- `sensor.solar_production`
- `sensor.grid_import`
- `sensor.battery_power`
- `sensor.battery_state_of_charge`
- `sensor.battery_mode`

## Troubleshooting

### Add-on won't start

1. Check the logs for error messages
2. Verify your FusionSolar credentials are correct
3. Make sure Mosquitto broker is running
4. Check MQTT credentials match your Mosquitto configuration

### Sensors not appearing

1. Make sure MQTT integration is configured in HA
2. Check that the add-on is publishing: Look for "✓ Published to MQTT" in logs
3. Restart Home Assistant: **Settings** → **System** → **Restart**

### Login fails

1. Set `HEADLESS=false` temporarily to see the browser (not possible in add-on)
2. Check the screenshots in the add-on (not available in container)
3. Verify credentials by logging in manually to FusionSolar web portal

## Creating Dashboards

Once sensors are working, create an energy dashboard:

1. Go to **Settings** → **Dashboards** → **Energy**
2. Configure:
   - **Solar Production**: `sensor.solar_production`
   - **Grid Consumption**: `sensor.grid_import`
   - **Battery Storage**: `sensor.battery_power`

Or create a custom card:

```yaml
type: entities
title: Solar System
entities:
  - entity: sensor.solar_production
    name: Solar Production
  - entity: sensor.solar_electrical_load
    name: House Load
  - entity: sensor.grid_import
    name: Grid Import
  - entity: sensor.battery_state_of_charge
    name: Battery
  - entity: sensor.battery_mode
    name: Battery Mode
```
