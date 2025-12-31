# FusionSolar MQTT Bridge Add-on

![Supports aarch64 Architecture][aarch64-shield]
![Supports amd64 Architecture][amd64-shield]
![Supports armhf Architecture][armhf-shield]
![Supports armv7 Architecture][armv7-shield]
![Supports i386 Architecture][i386-shield]

## About

This Home Assistant add-on fetches real-time data from Huawei FusionSolar solar systems and publishes it to MQTT for integration with Home Assistant.

## Features

- ✅ Automatic login to FusionSolar portal using Puppeteer
- ✅ Fetches real-time solar system metrics every minute
- ✅ Publishes data to MQTT with Home Assistant auto-discovery
- ✅ Persistent session management (cookies saved between restarts)
- ✅ 6 sensors automatically created

## Prerequisites

Before installing this add-on, you need:

1. **Mosquitto MQTT Broker** installed and running
2. **MQTT Integration** configured in Home Assistant
3. **MQTT User** created in Home Assistant

**Don't have these?** Follow the installation guide below - it covers everything!

## Installation

### Step 1: Install Mosquitto Broker

**If you don't have Mosquitto installed:**

1. Go to **Settings** → **Add-ons** → **Add-on Store**
2. Search for "**Mosquitto broker**"
3. Click **Install**
4. Once installed, go to **Info** tab
5. Enable "**Start on boot**" ✅
6. Click **START** 🚀

### Step 2: Configure MQTT Integration

1. Go to **Settings** → **Devices & Services** → **Integrations**
2. **MQTT** should appear as a discovered integration at the top
3. Click **Configure**
4. Check "**Enable discovery**" ✅
5. Click **Submit**

**If MQTT doesn't appear:** Restart Home Assistant and check again.

### Step 3: Create MQTT User

**⚠️ Important:** This step is required! The add-on needs MQTT credentials.

1. Click on your **profile** (bottom left corner)
2. Scroll down and enable "**Advanced Mode**" ✅
3. Go to **Settings** → **People** → **Users**
4. Click **ADD USER** (bottom right)
5. Fill in the form:
   - **Name**: `MQTT Client` (or any name you like)
   - **Username**: `mqtt_user` ⚠️ **NOT** "homeassistant" or "addons"
   - **Password**: Create a secure password and **save it**!
   - Uncheck "Can only log in from local network" (optional)
   - Check "Allow person to log in" ✅
6. Click **CREATE**

**Remember this username and password** - you'll need them in Step 5!

### Step 4: Add This Repository

1. Go to **Settings** → **Add-ons** → **Add-on Store**
2. Click the **⋮** (three dots) menu in the top right
3. Select **Repositories**
4. Add this URL:
   ```
   https://github.com/ihkawiss/fusion-solar-api-ha
   ```
5. Click **Add**
6. Close the dialog

### Step 5: Install FusionSolar Add-on

1. Scroll down in the Add-on Store
2. Find "**FusionSolar MQTT Bridge**"
3. Click on it
4. Click **Install**
5. ⏱️ Wait 5-10 minutes for the build to complete

### Step 6: Find Your Station DN

**Before configuring, you need your Station DN from FusionSolar:**

1. Open https://eu5.fusionsolar.huawei.com in your browser
2. Log in with your FusionSolar credentials
3. Navigate to your plant/station
4. Look at the **URL** in your browser address bar
5. Find the part that says `stationDn=NE%3D123456789`
6. Copy the number after `NE%3D` (e.g., `123456789`)
7. Your Station DN is: `NE=123456789` (format: `NE=` + the number)

**Example URL:**
```
https://uni004eu5.fusionsolar.huawei.com/...?stationDn=NE%3D123456789&...
                                                        ^^^^^^^^^^^^
                                                    Your Station DN: NE=123456789
```

### Step 7: Configure the Add-on

1. After installation completes, go to the **Configuration** tab
2. Fill in all the fields:

```yaml
fusionsolar_username: "your.email@example.com"
fusionsolar_password: "your_fusionsolar_password"
mqtt_host: "core-mosquitto"
mqtt_port: 1883
mqtt_username: "mqtt_user"
mqtt_password: "your_mqtt_user_password"
poll_interval_minutes: 1
station_dn: "NE=123456789"
```

**To find your Station DN:**
1. Log into FusionSolar web portal: https://eu5.fusionsolar.huawei.com
2. Navigate to your plant
3. Look at the URL - it contains `stationDn=NE%3D123456789`
4. Use the part after `NE%3D` (or `NE=`), e.g., `NE=123456789`

### Step 6: Start the Add-on

1. Click **Save**
2. Go to the **Info** tab
3. Enable "Start on boot"
4. Enable "Watchdog" (optional)
5. Click **Start**

### Step 7: Verify

1. Check the **Log** tab for success messages
2. Go to **Developer Tools** → **States**
3. Search for `sensor.solar_` to see your sensors!

## Sensors

Once configured and running, the following sensors will be automatically discovered in Home Assistant:

- `sensor.solar_electrical_load` - Household electrical consumption (kW)
- `sensor.solar_production` - Solar panel production (kW)
- `sensor.grid_import` - Power being imported from the grid (kW)
- `sensor.battery_power` - Battery charge/discharge power (kW)
- `sensor.battery_state_of_charge` - Battery SOC (%)
- `sensor.battery_mode` - Current battery operating mode
- `sensor.exceeding_power` - Surplus power available (kW)
  - Shows how much excess solar power you have available
  - **Always 0 or positive** (never negative)
  - 0 kW = No surplus (consuming all or more than producing)
  - >0 kW = Surplus available for charging batteries, heating water, etc.

## Finding Your Station DN

Your Station DN is a unique identifier for your solar installation. You can find it by:

1. Log into the FusionSolar web portal
2. Navigate to your plant/station
3. Look at the URL in your browser - it will contain something like `stationDn=NE%3D123456789`
4. The part after `NE%3D` (or `NE=`) is your station DN
5. In this example, use `NE=123456789` in the configuration

## Configuration Example

```yaml
fusionsolar_username: "your.email@example.com"
fusionsolar_password: "YourSecurePassword"
mqtt_host: "core-mosquitto"
mqtt_port: 1883
mqtt_username: "mqtt_user"
mqtt_password: "mqtt_password"
poll_interval_minutes: 1
station_dn: "NE=123456789"
```

**Note:** MQTT authentication is required. You must create a Home Assistant user for MQTT access.

## Troubleshooting

### "Connection refused: Not authorized" error

This means MQTT authentication is required:
1. Enable Advanced Mode in your HA profile
2. Create a new user in Settings → People → Users
3. Use that username/password in the add-on configuration
4. Restart the add-on

### Add-on won't start

1. Check the logs for error messages
2. Verify your FusionSolar credentials are correct
3. Make sure Mosquitto broker is running
4. Verify MQTT credentials match your HA user

### Sensors not appearing

1. Make sure MQTT integration is configured with discovery enabled
2. Check that the add-on logs show "✓ Published to MQTT"
3. Go to Developer Tools → States and search for `sensor.solar_`
4. Restart Home Assistant if needed

### Login fails

1. Verify credentials by logging in manually to FusionSolar web portal
2. Check the add-on logs for detailed error messages
3. Ensure your Station DN is correct

## Creating Dashboards

For issues and questions, please open an issue on [GitHub](https://github.com/ihkawiss/fusion-solar-api-ha/issues).

## License

MIT License - See LICENSE file for details

[aarch64-shield]: https://img.shields.io/badge/aarch64-yes-green.svg
[amd64-shield]: https://img.shields.io/badge/amd64-yes-green.svg
[armhf-shield]: https://img.shields.io/badge/armhf-yes-green.svg
[armv7-shield]: https://img.shields.io/badge/armv7-yes-green.svg
[i386-shield]: https://img.shields.io/badge/i386-yes-green.svg
