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
- Mode: box (allows manual entry with keyboard)
- Note: 2A minimum charging = ~0.46 kW, so you can go as low as 0.5 kW

#### Input Number: Maximum Charging Amps
- Name: `Tesla Charging - Max Amps`
- Entity ID: `input_number.tesla_max_amps`
- Min: 5
- Max: 16
- Step: 1
- Unit: A
- Default: 16

#### Input Number: Battery Max Charge Rate
- Name: `Tesla Charging - Battery Max Charge Rate`
- Entity ID: `input_number.battery_max_charge_rate`
- Min: 0
- Max: 10
- Step: 0.5
- Unit: kW
- Default: 3.5
- Mode: box (allows manual entry with keyboard)

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
          {% set surplus = states('sensor.fusionsolar_system_exceeding_power') | float(0) %}
          {% set battery_soc = states('sensor.fusionsolar_system_battery_state_of_charge') | float(0) %}
          {% set battery_power = states('sensor.fusionsolar_system_battery_power') | float(0) %}
          {% set threshold = states('input_number.tesla_battery_priority_threshold') | float(50) %}
          {% set battery_max = states('input_number.battery_max_charge_rate') | float(3.5) %}
          {% set max_amps = states('input_number.tesla_max_amps') | int(16) %}
          
          {% if battery_soc < threshold and battery_power > 0 %}
            {# Battery is below threshold and charging - subtract what battery is using #}
            {% set available = surplus - battery_power %}
          {% else %}
            {# Battery OK or not charging - use full surplus #}
            {% set available = surplus %}
          {% endif %}
          
          {# Three-phase 400V calculation: Power(kW) = √3 × 400V × Amps / 1000 #}
          {# Therefore: Amps = Power(kW) × 1000 / (√3 × 400) = Power / 0.6928 #}
          {% set calculated = (available / 0.6928) | int %}
          {% set min_amps = 2 %}
          {% if calculated < min_amps %}
            0
          {% else %}
            {{ min(calculated, max_amps) }}
          {% endif %}
        attributes:
          phases: "3"
          available_surplus: >
            {% set surplus = states('sensor.fusionsolar_system_exceeding_power') | float(0) %}
            {% set battery_soc = states('sensor.fusionsolar_system_battery_state_of_charge') | float(0) %}
            {% set battery_power = states('sensor.fusionsolar_system_battery_power') | float(0) %}
            {% set threshold = states('input_number.tesla_battery_priority_threshold') | float(50) %}
            {% if battery_soc < threshold and battery_power > 0 %}
              {{ (surplus - battery_power) | round(2) }}
            {% else %}
              {{ surplus }}
            {% endif %}
          note: "Accounts for battery priority - shows remaining surplus after battery charging"
      - name: "Tesla Charging Status"
        unique_id: tesla_charging_status
        state: >
          {% set battery_soc = states('sensor.fusionsolar_system_battery_state_of_charge') | float(0) %}
          {% set threshold = states('input_number.tesla_battery_priority_threshold') | float(50) %}
          {% set surplus = states('sensor.fusionsolar_system_exceeding_power') | float(0) %}
          {% set battery_power = states('sensor.fusionsolar_system_battery_power') | float(0) %}
          {% set min_surplus = states('input_number.tesla_min_surplus') | float(1.5) %}
          {% set smart_enabled = is_state('input_boolean.tesla_smart_charging', 'on') %}
          {% set is_charging = is_state('switch.t_j_fast_aufladung', 'on') %}
          {% set tesla_amps = states('number.t_j_fast_ladestrom') | float(0) %}
          {% set tesla_power = tesla_amps * 0.6928 %}
          {# Add back Tesla's power if charging (circular logic fix) #}
          {% set effective_surplus = surplus + (tesla_power if is_charging else 0) %}
          
          {% if not smart_enabled %}
            disabled
          {% elif battery_soc < threshold and battery_power > 0 %}
            {% set available = effective_surplus - battery_power %}
            {% if available >= min_surplus %}
              charging_available_limited
            {% else %}
              battery_priority
            {% endif %}
          {% elif effective_surplus < min_surplus %}
            no_surplus
          {% else %}
            charging_available
          {% endif %}
      
      - name: "Tesla Effective Surplus"
        unique_id: tesla_effective_surplus
        unit_of_measurement: "kW"
        device_class: power
        state_class: measurement
        state: >
          {% set surplus = states('sensor.fusionsolar_system_exceeding_power') | float(0) %}
          {% set is_charging = is_state('switch.t_j_fast_aufladung', 'on') %}
          {% set tesla_amps = states('number.t_j_fast_ladestrom') | float(0) %}
          {% set tesla_power = tesla_amps * 0.6928 %}
          {# Add back Tesla's power if charging (shows true available solar) #}
          {{ (surplus + (tesla_power if is_charging else 0)) | round(2) }}
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
        entity_id: sensor.fusionsolar_system_exceeding_power
      # Also check when battery SOC changes
      - platform: state
        entity_id: sensor.fusionsolar_system_battery_state_of_charge
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
      - variables:
          surplus: "{{ states('sensor.fusionsolar_system_exceeding_power') | float(0) }}"
          battery_soc: "{{ states('sensor.fusionsolar_system_battery_state_of_charge') | float(0) }}"
          battery_power: "{{ states('sensor.fusionsolar_system_battery_power') | float(0) }}"
          threshold: "{{ states('input_number.tesla_battery_priority_threshold') | float(50) }}"
          min_surplus: "{{ states('input_number.tesla_min_surplus') | float(1.5) }}"
          is_charging: "{{ is_state('switch.t_j_fast_aufladung', 'on') }}"
          tesla_amps: "{{ states('number.t_j_fast_ladestrom') | float(0) }}"
          tesla_power: "{{ tesla_amps * 0.6928 }}"
          # Add back Tesla's power if charging (circular logic fix)
          effective_surplus: "{{ surplus + (tesla_power if is_charging else 0) }}"
          calculated_amps: "{{ states('sensor.tesla_calculated_charging_amps') | int(0) }}"
          
      - choose:
          # Case 1: Home battery below threshold - check if there's surplus after battery
          - conditions:
              - condition: numeric_state
                entity_id: sensor.fusionsolar_system_battery_state_of_charge
                below: input_number.tesla_battery_priority_threshold
            sequence:
              - choose:
                  # Case 1a: Battery charging, but still surplus left - use remainder
                  - conditions:
                      - condition: template
                        value_template: >
                          {% set effective_surplus = states('sensor.tesla_effective_surplus') | float(0) %}
                          {% set battery_power = states('sensor.fusionsolar_system_battery_power') | float(0) %}
                          {% set min_surplus = states('input_number.tesla_min_surplus') | float(1.5) %}
                          {% set available = effective_surplus - battery_power %}
                          {{ battery_power > 0 and available >= min_surplus }}
                    sequence:
                      # Calculate and set charging amps based on remaining surplus
                      - service: number.set_value
                        target:
                          entity_id: number.t_j_fast_ladestrom
                        data:
                          value: "{{ calculated_amps }}"
                      # Start charging
                      - service: switch.turn_on
                        target:
                          entity_id: switch.t_j_fast_aufladung
                      - service: notify.notify
                        data:
                          title: "Tesla Charging"
                          message: >
                            Charging at {{ calculated_amps }}A 
                            (Battery priority: {{ (effective_surplus - battery_power) | round(1) }} kW available)
                # Case 1b: Battery needs all the power - stop Tesla
                default:
                  - if:
                      - condition: template
                        value_template: "{{ is_charging }}"
                    then:
                      - service: switch.turn_off
                        target:
                          entity_id: switch.t_j_fast_aufladung
                      - service: notify.notify
                        data:
                          title: "Tesla Charging"
                          message: "Paused - Home battery priority ({{ battery_soc }}% - battery using {{ battery_power }} kW)"
          
          # Case 2: Enough surplus available - charge!
          - conditions:
              - condition: template
                value_template: "{{ effective_surplus >= min_surplus }}"
            sequence:
              # Calculate and set charging amps
              - service: number.set_value
                target:
                  entity_id: number.t_j_fast_ladestrom
                data:
                  value: "{{ calculated_amps }}"
              # Start charging
              - service: switch.turn_on
                target:
                  entity_id: switch.t_j_fast_aufladung
              - service: notify.notify
                data:
                  title: "Tesla Charging"
                  message: "Charging at {{ calculated_amps }}A ({{ effective_surplus | round(1) }} kW surplus)"
        
        # Default: Not enough surplus - stop charging
        default:
          - if:
              - condition: template
                value_template: "{{ is_charging }}"
            then:
              - service: switch.turn_off
                target:
                  entity_id: switch.t_j_fast_aufladung
              - service: notify.notify
                data:
                  title: "Tesla Charging"
                  message: "Paused - Insufficient surplus ({{ effective_surplus | round(1) }} kW)"

  # Automation 2: Stop Tesla Charging when surplus drops
  - id: tesla_smart_charging_stop
    alias: "Tesla: Smart Charging - Stop on Low Surplus"
    description: "Stop Tesla charging when surplus drops too low"
    mode: single
    trigger:
      - platform: numeric_state
        entity_id: sensor.tesla_effective_surplus
        below: 1.0  # Stop if effective surplus drops below 1 kW
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
          message: "Stopped - Surplus too low ({{ states('sensor.tesla_effective_surplus') }} kW)"
```

## Configuration Steps

### 1. Find Your Tesla Entities

1. Go to **Settings** → **Devices & Services** → **Tesla**
2. Click on your vehicle
3. Note down these entity IDs:
   - Charger switch: `switch.t_j_fast_aufladung`
   - Battery level: `sensor.t_j_fast_batteriestand`
   - Charging amps: `number.t_j_fast_ladestrom`

### 2. Replace Placeholders

In the automation above, all entities are already set:
- ✅ `switch.t_j_fast_aufladung` - Charger switch
- ✅ `sensor.t_j_fast_batteriestand` - Battery level
- ✅ `number.t_j_fast_ladestrom` - Charging amps

**No replacements needed!** Just copy and paste the automation. 🎉

### 3. Configuration Notes

The template is already configured for **Swiss three-phase 400V** systems (16A = 11 kW).

If you have a different setup:
- **Single-phase 230V**: Change calculation to `{% set calculated = (available * 1000 / 230) | int %}`
- **Three-phase 230V**: Change calculation to `{% set calculated = (available / 0.4) | int %}`

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
      - entity: sensor.fusionsolar_system_exceeding_power
        name: Available Surplus
      - entity: sensor.fusionsolar_system_battery_state_of_charge
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
      - entity: input_number.battery_max_charge_rate
        name: Battery Max Charge Rate

  - type: entities
    title: Tesla Vehicle
    entities:
      - entity: sensor.t_j_fast_batteriestand
        name: Tesla Battery
      - entity: switch.t_j_fast_aufladung
        name: Charger
      - entity: number.t_j_fast_ladestrom
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
   - Calculates: `Amps = Power(kW) / 0.6928` for three-phase 400V
   - Example: 3.5 kW surplus = 5A, 7 kW surplus = 10A, 11 kW surplus = 16A
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
- **Result**: Tesla charges at 9A (6 kW / 0.6928 ≈ 9A)

### Scenario 3: Midday (Good Surplus, Battery Low)
- Solar: 8 kW, Consumption: 2 kW
- Exceeding: 6 kW
- Battery SOC: 45%
- **Result**: Tesla NOT charging (battery priority)

### Scenario 4: Afternoon (Moderate Surplus)
- Solar: 5 kW, Consumption: 2 kW
- Exceeding: 3 kW
- Battery SOC: 90%
- **Result**: Tesla charges at 4A (3 kW / 0.6928 ≈ 4A)

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
