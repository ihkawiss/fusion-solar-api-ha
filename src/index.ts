import * as dotenv from 'dotenv';
import { FusionSolarClient } from './client';
import { MQTTPublisher } from './mqtt';

// Load environment variables
dotenv.config();

// Function to extract key metrics from energy flow data
function extractKeyMetrics(data: any) {
  if (!data || !data.data || !data.data.flow) {
    return null;
  }

  const flow = data.data.flow;
  const metrics: any = {};

  // Extract electrical load (household consumption)
  const loadNode = flow.nodes.find((node: any) => 
    node.name === 'neteco.pvms.KPI.kpiView.electricalLoad'
  );
  if (loadNode) {
    metrics.electricalLoad = {
      label: 'Electrical Load (Household)',
      value: loadNode.description.value,
      numericValue: loadNode.value
    };
  }

  // Extract input power (solar production)
  const inputPowerLink = flow.links.find((link: any) =>
    link.description?.label === 'neteco.pvms.energy.flow.input.power'
  );
  if (inputPowerLink) {
    metrics.inputPower = {
      label: 'Solar Production',
      value: inputPowerLink.description.value
    };
  }

  // Extract buy power (grid import)
  const buyPowerLink = flow.links.find((link: any) =>
    link.description?.label === 'neteco.pvms.energy.flow.buy.power'
  );
  if (buyPowerLink) {
    metrics.buyPower = {
      label: 'Grid Import',
      value: buyPowerLink.description.value
    };
  }

  // Extract battery info
  const batteryNode = flow.nodes.find((node: any) =>
    node.name === 'neteco.pvms.devTypeLangKey.energy_store'
  );
  if (batteryNode && batteryNode.deviceTips) {
    metrics.battery = {
      label: 'Battery',
      soc: batteryNode.deviceTips.SOC + '%',
      power: batteryNode.description.value,
      chargeMode: batteryNode.deviceTips.CHARGE_MODE_VALUE
    };
  }

  return metrics;
}

// Global reference for cleanup
let mqttPublisher: MQTTPublisher | null = null;

async function main() {
  // Validate environment variables
  const username = process.env.FUSIONSOLAR_USERNAME;
  const password = process.env.FUSIONSOLAR_PASSWORD;
  const pollIntervalMinutes = parseInt(process.env.POLL_INTERVAL_MINUTES || '1', 10);
  const stationDn = process.env.STATION_DN || 'NE=XXXXXXXXXXXX';

  // MQTT configuration (optional)
  const mqttEnabled = process.env.MQTT_HOST ? true : false;
  const mqttHost = process.env.MQTT_HOST || 'localhost';
  const mqttPort = parseInt(process.env.MQTT_PORT || '1883', 10);
  const mqttUsername = process.env.MQTT_USERNAME;
  const mqttPassword = process.env.MQTT_PASSWORD;

  if (!username || !password) {
    console.error('Error: FUSIONSOLAR_USERNAME and FUSIONSOLAR_PASSWORD must be set in .env file');
    console.error('Please copy .env.example to .env and fill in your credentials');
    process.exit(1);
  }

  console.log('Starting FusionSolar API client...');
  console.log(`Poll interval: ${pollIntervalMinutes} minute(s)`);
  console.log(`Station DN: ${stationDn}`);
  
  if (mqttEnabled) {
    console.log(`MQTT: Enabled (${mqttHost}:${mqttPort})`);
  } else {
    console.log('MQTT: Disabled (no MQTT_HOST configured)');
  }

  // Create client instance
  // Set headless to false if you want to see the browser during login for debugging
  const headless = process.env.HEADLESS !== 'false';
  const client = new FusionSolarClient({
    username,
    password
  }, 'cookies.json', headless);

  // Update client to use configured station DN
  (client as any).stationDn = stationDn;

  // Initialize MQTT if enabled
  if (mqttEnabled) {
    mqttPublisher = new MQTTPublisher({
      host: mqttHost,
      port: mqttPort,
      username: mqttUsername,
      password: mqttPassword
    });

    try {
      await mqttPublisher.connect();
    } catch (error) {
      console.error('Failed to connect to MQTT broker:', error);
      console.log('Continuing without MQTT...');
      mqttPublisher = null;
    }
  }

  // Function to fetch and display energy flow data
  async function fetchEnergyFlow() {
    try {
      console.log(`\n[${new Date().toISOString()}] Fetching energy flow data...`);
      
      const data = await client.getEnergyFlow();
      
      // Extract key metrics
      const metrics = extractKeyMetrics(data);
      
      if (metrics) {
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 SOLAR SYSTEM METRICS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        if (metrics.electricalLoad) {
          console.log(`🏠 ${metrics.electricalLoad.label}: ${metrics.electricalLoad.value}`);
        }
        
        if (metrics.inputPower) {
          console.log(`☀️  ${metrics.inputPower.label}: ${metrics.inputPower.value}`);
        }
        
        if (metrics.buyPower) {
          console.log(`⚡ ${metrics.buyPower.label}: ${metrics.buyPower.value}`);
        }
        
        if (metrics.battery) {
          console.log(`🔋 ${metrics.battery.label}: ${metrics.battery.power} (SOC: ${metrics.battery.soc})`);
          console.log(`   Mode: ${metrics.battery.chargeMode}`);
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Publish to MQTT if enabled
        if (mqttPublisher) {
          mqttPublisher.publishMetrics(metrics);
          console.log('✓ Published to MQTT');
        }
      }
      
      // Optionally log full data for debugging
      if (process.env.DEBUG === 'true') {
        console.log('Full Energy Flow Data:');
        console.log(JSON.stringify(data, null, 2));
      }
      
    } catch (error) {
      console.error('Error fetching energy flow data:', error instanceof Error ? error.message : error);
    }
  }

  // Fetch immediately on start
  await fetchEnergyFlow();

  // Set up recurring fetch
  const intervalMs = pollIntervalMinutes * 60 * 1000;
  setInterval(fetchEnergyFlow, intervalMs);

  console.log('\nScheduled to fetch data every', pollIntervalMinutes, 'minute(s)');
  console.log('Press Ctrl+C to stop\n');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  if (mqttPublisher) {
    mqttPublisher.disconnect();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  if (mqttPublisher) {
    mqttPublisher.disconnect();
  }
  process.exit(0);
});

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
