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
  ) {
    update_building_by_pk(
      pk_columns: { id: $id }
      _set: {
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

export const DELETE_BUILDING = `
  mutation DeleteBuilding($id: bigint!) {
    delete_building_by_pk(id: $id) {
      id
    }
  }
`
