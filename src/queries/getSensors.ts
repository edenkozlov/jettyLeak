export const GET_SENSORS = `
  query GetSensors {
    sensor(order_by: { created_at: desc }) {
      id
      created_at
      name
      location
      building_id
      mappings
      multiplier
      type
      last_wifi
      last_lora
      firmware_version
      floor_number
      building {
        id
        name
        full_address
      }
    }
  }
`
