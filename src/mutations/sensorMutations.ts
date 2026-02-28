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

export const UPDATE_SENSOR_POSITION = `
  mutation UpdateSensorPosition(
    $id: bigint!
    $floor_number: bigint
    $location_on_floor: jsonb
  ) {
    update_sensor_by_pk(
      pk_columns: { id: $id }
      _set: {
        floor_number: $floor_number
        location_on_floor: $location_on_floor
      }
    ) {
      id
      floor_number
      location_on_floor
    }
  }
`

export const UPDATE_SENSOR_AREA = `
  mutation UpdateSensorArea($id: bigint!, $area_covered: jsonb) {
    update_sensor_by_pk(
      pk_columns: { id: $id }
      _set: { area_covered: $area_covered }
    ) {
      id
      area_covered
    }
  }
`

export const UPDATE_SENSOR_MAPPINGS = `
  mutation UpdateSensorMappings($id: bigint!, $mappings: jsonb!) {
    update_sensor_by_pk(
      pk_columns: { id: $id }
      _set: { mappings: $mappings }
    ) {
      id
      mappings
    }
  }
`
