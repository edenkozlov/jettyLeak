export const GET_BUILDING_BY_ID = `
  query GetBuildingById($id: bigint!) {
    building_by_pk(id: $id) {
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
        email
      }
      sensors {
        id
        name
        location
      }
    }
  }
`
