import * as mqtt from 'mqtt';

interface MQTTConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
}

export class MQTTPublisher {
  private client: mqtt.MqttClient | null = null;
  private config: MQTTConfig;
  private connected = false;

  constructor(config: MQTTConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const mqttUrl = `mqtt://${this.config.host}:${this.config.port}`;
      
      console.log(`Connecting to MQTT broker at ${mqttUrl}...`);

      const options: mqtt.IClientOptions = {
        username: this.config.username,
        password: this.config.password,
        reconnectPeriod: 5000,
        connectTimeout: 30000
      };

      this.client = mqtt.connect(mqttUrl, options);

      this.client.on('connect', () => {
        console.log('✓ Connected to MQTT broker');
        this.connected = true;
        this.publishDiscovery();
        resolve();
      });

      this.client.on('error', (error: Error) => {
        console.error('MQTT connection error:', error);
        if (!this.connected) {
          reject(error);
        }
      });

      this.client.on('offline', () => {
        console.log('MQTT client offline');
        this.connected = false;
      });

      this.client.on('reconnect', () => {
        console.log('Reconnecting to MQTT broker...');
      });
    });
  }

  /**
   * Publish Home Assistant MQTT Discovery messages
   */
  private publishDiscovery(): void {
    if (!this.client || !this.connected) return;

    const deviceInfo = {
      identifiers: ['fusionsolar_bridge'],
      name: 'FusionSolar System',
      model: 'Huawei FusionSolar',
      manufacturer: 'Huawei'
    };

    // Electrical Load sensor
    const loadConfig = {
      name: 'Solar Electrical Load',
      unique_id: 'fusionsolar_electrical_load',
      state_topic: 'homeassistant/sensor/fusionsolar/electrical_load/state',
      unit_of_measurement: 'kW',
      device_class: 'power',
      state_class: 'measurement',
      icon: 'mdi:home-lightning-bolt',
      device: deviceInfo
    };
    this.client.publish(
      'homeassistant/sensor/fusionsolar/electrical_load/config',
      JSON.stringify(loadConfig),
      { retain: true }
    );

    // Solar Production sensor
    const solarConfig = {
      name: 'Solar Production',
      unique_id: 'fusionsolar_solar_production',
      state_topic: 'homeassistant/sensor/fusionsolar/solar_production/state',
      unit_of_measurement: 'kW',
      device_class: 'power',
      state_class: 'measurement',
      icon: 'mdi:solar-power',
      device: deviceInfo
    };
    this.client.publish(
      'homeassistant/sensor/fusionsolar/solar_production/config',
      JSON.stringify(solarConfig),
      { retain: true }
    );

    // Grid Import sensor
    const gridConfig = {
      name: 'Grid Import',
      unique_id: 'fusionsolar_grid_import',
      state_topic: 'homeassistant/sensor/fusionsolar/grid_import/state',
      unit_of_measurement: 'kW',
      device_class: 'power',
      state_class: 'measurement',
      icon: 'mdi:transmission-tower',
      device: deviceInfo
    };
    this.client.publish(
      'homeassistant/sensor/fusionsolar/grid_import/config',
      JSON.stringify(gridConfig),
      { retain: true }
    );

    // Battery Power sensor
    const batteryPowerConfig = {
      name: 'Battery Power',
      unique_id: 'fusionsolar_battery_power',
      state_topic: 'homeassistant/sensor/fusionsolar/battery_power/state',
      unit_of_measurement: 'kW',
      device_class: 'power',
      state_class: 'measurement',
      icon: 'mdi:battery',
      device: deviceInfo
    };
    this.client.publish(
      'homeassistant/sensor/fusionsolar/battery_power/config',
      JSON.stringify(batteryPowerConfig),
      { retain: true }
    );

    // Battery SOC sensor
    const batterySocConfig = {
      name: 'Battery State of Charge',
      unique_id: 'fusionsolar_battery_soc',
      state_topic: 'homeassistant/sensor/fusionsolar/battery_soc/state',
      unit_of_measurement: '%',
      device_class: 'battery',
      state_class: 'measurement',
      icon: 'mdi:battery-50',
      device: deviceInfo
    };
    this.client.publish(
      'homeassistant/sensor/fusionsolar/battery_soc/config',
      JSON.stringify(batterySocConfig),
      { retain: true }
    );

    // Battery Mode sensor
    const batteryModeConfig = {
      name: 'Battery Mode',
      unique_id: 'fusionsolar_battery_mode',
      state_topic: 'homeassistant/sensor/fusionsolar/battery_mode/state',
      icon: 'mdi:battery-charging',
      device: deviceInfo
    };
    this.client.publish(
      'homeassistant/sensor/fusionsolar/battery_mode/config',
      JSON.stringify(batteryModeConfig),
      { retain: true }
    );

    // Exceeding Power sensor (surplus/deficit)
    const exceedingPowerConfig = {
      name: 'Exceeding Power',
      unique_id: 'fusionsolar_exceeding_power',
      state_topic: 'homeassistant/sensor/fusionsolar/exceeding_power/state',
      unit_of_measurement: 'kW',
      device_class: 'power',
      state_class: 'measurement',
      icon: 'mdi:solar-power-variant',
      device: deviceInfo
    };
    this.client.publish(
      'homeassistant/sensor/fusionsolar/exceeding_power/config',
      JSON.stringify(exceedingPowerConfig),
      { retain: true }
    );

    console.log('✓ Published MQTT discovery messages');
  }

  /**
   * Publish metrics to MQTT
   */
  publishMetrics(metrics: any): void {
    if (!this.client || !this.connected) {
      console.warn('MQTT client not connected, skipping publish');
      return;
    }

    // Publish electrical load
    if (metrics.electricalLoad) {
      this.client.publish(
        'homeassistant/sensor/fusionsolar/electrical_load/state',
        metrics.electricalLoad.numericValue.toString()
      );
    }

    // Publish solar production (extract numeric value from string like "0.000 kW")
    if (metrics.inputPower) {
      const value = parseFloat(metrics.inputPower.value.split(' ')[0]) || 0;
      this.client.publish(
        'homeassistant/sensor/fusionsolar/solar_production/state',
        value.toString()
      );
    }

    // Publish grid import
    if (metrics.buyPower) {
      const value = parseFloat(metrics.buyPower.value.split(' ')[0]) || 0;
      this.client.publish(
        'homeassistant/sensor/fusionsolar/grid_import/state',
        value.toString()
      );
    }

    // Publish battery metrics
    if (metrics.battery) {
      // Battery power
      const batteryPower = parseFloat(metrics.battery.power.split(' ')[0]) || 0;
      this.client.publish(
        'homeassistant/sensor/fusionsolar/battery_power/state',
        batteryPower.toString()
      );

      // Battery SOC
      const soc = parseFloat(metrics.battery.soc.replace('%', '')) || 0;
      this.client.publish(
        'homeassistant/sensor/fusionsolar/battery_soc/state',
        soc.toString()
      );

      // Battery mode
      this.client.publish(
        'homeassistant/sensor/fusionsolar/battery_mode/state',
        metrics.battery.chargeMode
      );
    }

    // Publish exceeding power (surplus/deficit)
    if (metrics.exceedingPower) {
      this.client.publish(
        'homeassistant/sensor/fusionsolar/exceeding_power/state',
        metrics.exceedingPower.numericValue.toString()
      );
    }
  }

  disconnect(): void {
    if (this.client) {
      this.client.end();
      console.log('Disconnected from MQTT broker');
    }
  }
}
