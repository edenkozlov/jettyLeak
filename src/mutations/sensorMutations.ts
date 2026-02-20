export const CREATE_SENSOR = `
  mutation CreateSensor(
    $name: String
    $location: String
    $building_id: bigint
  ) {
    insert_sensor_one(
      object: {
        name: $name
        location: $location
        building_id: $building_id
      }
    ) {
      id
      created_at
      name
      location
      building_id
    }
  }
`

export const UPDATE_SENSOR = `
  mutation UpdateSensor(
    $id: bigint!
    $name: String
    $location: String
    $building_id: bigint
  ) {
    update_sensor_by_pk(
      pk_columns: { id: $id }
      _set: {
        name: $name
        location: $location
        building_id: $building_id
      }
    ) {
      id
      created_at
      name
      location
      building_id
    }
  }
`

export const DELETE_SENSOR = `
  mutation DeleteSensor($id: bigint!) {
    delete_sensor_by_pk(id: $id) {
      id
    }
  }
`
