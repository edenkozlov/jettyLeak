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
      footprint
      number_of_floors
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
        floor_number
        location_on_floor
        area_covered
      }
      fixtures {
        id
        created_at
        type
        floor_number
        location_on_floor
        sensor_id
      }
    }
  }
`
