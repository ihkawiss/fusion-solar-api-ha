#!/usr/bin/with-contenv bashio

# Get configuration from Home Assistant
export FUSIONSOLAR_USERNAME=$(bashio::config 'fusionsolar_username')
export FUSIONSOLAR_PASSWORD=$(bashio::config 'fusionsolar_password')
export MQTT_HOST=$(bashio::config 'mqtt_host')
export MQTT_PORT=$(bashio::config 'mqtt_port')
export MQTT_USERNAME=$(bashio::config 'mqtt_username')
export MQTT_PASSWORD=$(bashio::config 'mqtt_password')
export POLL_INTERVAL_MINUTES=$(bashio::config 'poll_interval_minutes')
export STATION_DN=$(bashio::config 'station_dn')
export HEADLESS=true

bashio::log.info "Starting FusionSolar MQTT Bridge..."
bashio::log.info "Connecting to MQTT broker at ${MQTT_HOST}:${MQTT_PORT}"
bashio::log.info "Poll interval: ${POLL_INTERVAL_MINUTES} minute(s)"

# Run the application
cd /app
exec node dist/index.js
