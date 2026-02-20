export const GET_BUILDINGS = `
  query GetBuildings {
    building(order_by: { created_at: desc }) {
      id
      created_at
      name
      full_address
      latitude
      longitude
      client_id
      client {
        id
        first_name
        last_name
      }
    }
  }
`
