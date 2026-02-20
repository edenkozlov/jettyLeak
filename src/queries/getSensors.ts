export const GET_SENSORS = `
  query GetSensors {
    sensor(order_by: { created_at: desc }) {
      id
      created_at
      name
      location
      building_id
      mappings
      building {
        id
        name
      }
    }
  }
`
