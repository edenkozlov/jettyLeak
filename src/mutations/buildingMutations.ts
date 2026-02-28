export const CREATE_BUILDING = `
  mutation CreateBuilding(
    $name: String
    $full_address: String
    $latitude: float8
    $longitude: float8
    $client_id: uuid
  ) {
    insert_building_one(
      object: {
        name: $name
        full_address: $full_address
        latitude: $latitude
        longitude: $longitude
        client_id: $client_id
      }
    ) {
      id
      created_at
      name
      full_address
      latitude
      longitude
      client_id
    }
  }
`

export const UPDATE_BUILDING = `
  mutation UpdateBuilding(
    $id: bigint!
    $name: String
    $full_address: String
    $latitude: float8
    $longitude: float8
    $client_id: uuid
    $footprint: jsonb
  ) {
    update_building_by_pk(
      pk_columns: { id: $id }
      _set: {
        name: $name
        full_address: $full_address
        latitude: $latitude
        longitude: $longitude
        client_id: $client_id
        footprint: $footprint
      }
    ) {
      id
      created_at
      name
      full_address
      latitude
      longitude
      client_id
      footprint
    }
  }
`

export const UPDATE_BUILDING_COORDINATES = `
  mutation UpdateBuildingCoordinates($id: bigint!, $latitude: float8, $longitude: float8) {
    update_building_by_pk(
      pk_columns: { id: $id }
      _set: { latitude: $latitude, longitude: $longitude }
    ) {
      id
      latitude
      longitude
    }
  }
`

export const UPDATE_BUILDING_FOOTPRINT = `
  mutation UpdateBuildingFootprint($id: bigint!, $footprint: jsonb) {
    update_building_by_pk(
      pk_columns: { id: $id }
      _set: { footprint: $footprint }
    ) {
      id
      footprint
    }
  }
`

export const UPDATE_BUILDING_FLOORS = `
  mutation UpdateBuildingFloors($id: bigint!, $number_of_floors: bigint) {
    update_building_by_pk(
      pk_columns: { id: $id }
      _set: { number_of_floors: $number_of_floors }
    ) {
      id
      number_of_floors
    }
  }
`

export const UPDATE_BUILDING_NAME = `
  mutation UpdateBuildingName($id: bigint!, $name: String) {
    update_building_by_pk(
      pk_columns: { id: $id }
      _set: { name: $name }
    ) {
      id
      name
    }
  }
`

export const DELETE_BUILDING = `
  mutation DeleteBuilding($id: bigint!) {
    delete_building_by_pk(id: $id) {
      id
    }
  }
`
