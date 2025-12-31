# Smart Tesla Charging Automation

This automation intelligently charges your Tesla EV based on available solar surplus power, while prioritizing your home battery when needed.

## Logic

1. **Priority Check**: If home battery SOC < 50%, don't charge Tesla (let battery charge first)
2. **Surplus Check**: Only charge if exceeding power > 1.5 kW (about 6.5A minimum)
3. **Dynamic Amperage**: Calculate charging amps based on available surplus (max 16A)
4. **Smart Stop**: Stop charging if surplus drops below 1 kW

## Prerequisites

### 1. Install Tesla Integration

Go to **Settings** → **Devices & Services** → **Add Integration** → Search "Tesla"

### 2. Create Helper Entities

Go to **Settings** → **Devices & Services** → **Helpers** → **Create Helper**

#### Input Number: Battery Priority Threshold
- Name: `Tesla Charging - Battery Priority Threshold`
- Entity ID: `input_number.tesla_battery_priority_threshold`
- Min: 0
- Max: 100
- Step: 5
- Unit: %
- Default: 50

#### Input Number: Minimum Surplus for Charging
- Name: `Tesla Charging - Minimum Surplus`
- Entity ID: `input_number.tesla_min_surplus`
- Min: 0
- Max: 10
- Step: 0.5
- Unit: kW
- Default: 1.5

#### Input Number: Maximum Charging Amps
- Name: `Tesla Charging - Max Amps`
- Entity ID: `input_number.tesla_max_amps`
- Min: 5
- Max: 16
- Step: 1
- Unit: A
- Default: 16

#### Input Boolean: Enable Smart Charging
- Name: `Tesla Smart Charging Enabled`
- Entity ID: `input_boolean.tesla_smart_charging`

## Template Sensors

Add these to your `configuration.yaml`:

```yaml
template:
  - sensor:
      - name: "Tesla Calculated Charging Amps"
        unique_id: tesla_calculated_charging_amps
        unit_of_measurement: "A"
        state: >
          {% set surplus = states('sensor.exceeding_power') | float(0) %}
          {% set voltage = 230 %}
          {% set phases = 1 %}
          {% set max_amps = states('input_number.tesla_max_amps') | int(16) %}
          {% set calculated = (surplus * 1000 / voltage / phases) | int %}
          {{ min(calculated, max_amps) }}
        attributes:
          phases: "1"
          note: "Change phases to 3 for three-phase charging"
      - name: "Tesla Charging Status"
        unique_id: tesla_charging_status
        state: >
          {% set battery_soc = states('sensor.battery_state_of_charge') | float(0) %}
          {% set threshold = states('input_number.tesla_battery_priority_threshold') | float(50) %}
          {% set surplus = states('sensor.exceeding_power') | float(0) %}
          {% set min_surplus = states('input_number.tesla_min_surplus') | float(1.5) %}
          {% set smart_enabled = is_state('input_boolean.tesla_smart_charging', 'on') %}
          
          {% if not smart_enabled %}
            disabled
          {% elif battery_soc < threshold %}
            battery_priority
          {% elif surplus < min_surplus %}
            no_surplus
          {% else %}
            charging_available
          {% endif %}
```

## Automations

Add these to your automations (or use the UI):

```yaml
# Automation 1: Start/Adjust Tesla Charging
automation:
  - id: tesla_smart_charging_start
    alias: "Tesla: Smart Charging - Start/Adjust"
    description: "Start or adjust Tesla charging based on solar surplus"
    mode: restart
    trigger:
      # Check every minute when exceeding power changes
      - platform: state
        entity_id: sensor.exceeding_power
      # Also check when battery SOC changes
      - platform: state
        entity_id: sensor.battery_state_of_charge
      # Check periodically
      - platform: time_pattern
        minutes: "/5"
    
    condition:
      # Smart charging must be enabled
      - condition: state
        entity_id: input_boolean.tesla_smart_charging
        state: "on"
      # Tesla not fully charged
      - condition: numeric_state
        entity_id: sensor.t_j_fast_batteriestand
        below: 95
    
    action:
      - choose:
          # Case 1: Home battery below threshold - stop Tesla charging
          - conditions:
              - condition: numeric_state
                entity_id: sensor.battery_state_of_charge
                below: input_number.tesla_battery_priority_threshold
            sequence:
              - service: switch.turn_off
                target:
                  entity_id: switch.t_j_fast_aufladung
              - service: notify.notify
                data:
                  title: "Tesla Charging"
                  message: "Paused - Home battery priority ({{ states('sensor.battery_state_of_charge') }}%)"
          
          # Case 2: Enough surplus available - charge!
          - conditions:
              - condition: numeric_state
                entity_id: sensor.exceeding_power
                above: input_number.tesla_min_surplus
            sequence:
              # Calculate and set charging amps
              - service: number.set_value
                target:
                  entity_id: number.YOUR_TESLA_charging_amps  # Change to your Tesla charging amps entity
                data:
                  value: "{{ states('sensor.tesla_calculated_charging_amps') | int }}"
              # Start charging
              - service: switch.turn_on
                target:
                  entity_id: switch.t_j_fast_aufladung
              - service: notify.notify
                data:
                  title: "Tesla Charging"
                  message: "Charging at {{ states('sensor.tesla_calculated_charging_amps') }}A ({{ states('sensor.exceeding_power') }} kW surplus)"
        
        # Default: Not enough surplus - stop charging
        default:
          - service: switch.turn_off
            target:
              entity_id: switch.t_j_fast_aufladung
          - service: notify.notify
            data:
              title: "Tesla Charging"
              message: "Paused - Insufficient surplus ({{ states('sensor.exceeding_power') }} kW)"

  # Automation 2: Stop Tesla Charging when surplus drops
  - id: tesla_smart_charging_stop
    alias: "Tesla: Smart Charging - Stop on Low Surplus"
    description: "Stop Tesla charging when surplus drops too low"
    mode: single
    trigger:
      - platform: numeric_state
        entity_id: sensor.exceeding_power
        below: 1.0  # Stop if surplus drops below 1 kW
        for:
          minutes: 2  # Wait 2 minutes to avoid fluctuations
    
    condition:
      - condition: state
        entity_id: input_boolean.tesla_smart_charging
        state: "on"
      - condition: state
        entity_id: switch.t_j_fast_aufladung
        state: "on"
    
    action:
      - service: switch.turn_off
        target:
          entity_id: switch.t_j_fast_aufladung
      - service: notify.notify
        data:
          title: "Tesla Charging"
          message: "Stopped - Surplus too low ({{ states('sensor.exceeding_power') }} kW)"
```

## Configuration Steps

### 1. Find Your Tesla Entities

1. Go to **Settings** → **Devices & Services** → **Tesla**
2. Click on your vehicle
3. Note down these entity IDs:
   - Charger switch: `switch.t_j_fast_aufladung`
   - Battery level: `sensor.t_j_fast_batteriestand`
   - Charging amps: `number.YOUR_TESLA_charging_amps`

### 2. Replace Placeholders

In the automation above, replace:
- `switch.t_j_fast_aufladung` → Already set! (your charger switch)
- `sensor.t_j_fast_batteriestand` → Already set! (your battery sensor)
- `number.YOUR_TESLA_charging_amps` → Your actual charging amps entity

### 3. Adjust for Three-Phase Charging

If you have three-phase charging, change `phases = 1` to `phases = 3` in the template:

```yaml
{% set phases = 3 %}
```

## Dashboard Card

Add this to your dashboard to control everything:

```yaml
type: vertical-stack
cards:
  - type: entities
    title: Tesla Smart Charging
    entities:
      - entity: input_boolean.tesla_smart_charging
        name: Enable Smart Charging
      - entity: sensor.tesla_charging_status
        name: Status
      - type: divider
      - entity: sensor.exceeding_power
        name: Available Surplus
      - entity: sensor.battery_state_of_charge
        name: Home Battery SOC
      - entity: sensor.tesla_calculated_charging_amps
        name: Charging Amps
      - type: divider
      - entity: input_number.tesla_battery_priority_threshold
        name: Battery Priority Threshold
      - entity: input_number.tesla_min_surplus
        name: Minimum Surplus
      - entity: input_number.tesla_max_amps
        name: Maximum Amps

  - type: entities
    title: Tesla Vehicle
    entities:
      - entity: sensor.t_j_fast_batteriestand
        name: Tesla Battery
      - entity: switch.t_j_fast_aufladung
        name: Charger
      - entity: number.YOUR_TESLA_charging_amps
        name: Charging Amps
```

## How It Works

1. **Every 5 minutes** (and when sensors change):
   - Checks if smart charging is enabled
   - Checks if Tesla is plugged in
   - Checks home battery SOC

2. **Priority Logic**:
   - If home battery < 50% → Stop Tesla, let home battery charge
   - If surplus < 1.5 kW → Stop Tesla
   - If surplus ≥ 1.5 kW → Charge Tesla

3. **Dynamic Amperage**:
   - Calculates: `Amps = (Surplus kW × 1000) / 230V / Phases`
   - Example: 3.5 kW surplus = 15A on single-phase
   - Respects maximum amps setting (default 16A)

4. **Hysteresis**:
   - Starts charging at 1.5 kW surplus
   - Stops charging at 1.0 kW surplus (2 min delay)
   - Prevents constant on/off switching

## Example Scenarios

### Scenario 1: Morning (Low Surplus)
- Solar: 2 kW, Consumption: 1 kW
- Exceeding: 1 kW
- Battery SOC: 60%
- **Result**: No charging (below 1.5 kW minimum)

### Scenario 2: Midday (Good Surplus, Battery OK)
- Solar: 8 kW, Consumption: 2 kW
- Exceeding: 6 kW
- Battery SOC: 80%
- **Result**: Tesla charges at 16A (max, limited by setting)

### Scenario 3: Midday (Good Surplus, Battery Low)
- Solar: 8 kW, Consumption: 2 kW
- Exceeding: 6 kW
- Battery SOC: 45%
- **Result**: Tesla NOT charging (battery priority)

### Scenario 4: Afternoon (Moderate Surplus)
- Solar: 5 kW, Consumption: 2 kW
- Exceeding: 3 kW
- Battery SOC: 90%
- **Result**: Tesla charges at 13A

## Troubleshooting

### Tesla not charging
1. Check `input_boolean.tesla_smart_charging` is ON
2. Check home battery SOC > threshold
3. Check exceeding power > 1.5 kW
4. Check Tesla is plugged in
5. Check automation logs

### Charging too aggressive/conservative
- Adjust `input_number.tesla_min_surplus`
- Adjust `input_number.tesla_max_amps`

### Want manual control
- Turn OFF `input_boolean.tesla_smart_charging`
- Use Tesla app as normal

## Advanced: Time-Based Rules

Want to charge only during certain hours? Add this condition to the automation:

```yaml
condition:
  # ... existing conditions ...
  - condition: time
    after: "09:00:00"
    before: "16:00:00"  # Only charge 9 AM - 4 PM
```

## Advanced: Grid Price Integration

Have dynamic electricity prices? Combine with Tibber/Nordpool:

```yaml
condition:
  # ... existing conditions ...
  - condition: numeric_state
    entity_id: sensor.electricity_price  # Your price sensor
    below: 0.20  # Only charge if price < 20 cents/kWh
```
