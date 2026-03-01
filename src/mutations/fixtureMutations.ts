export const CREATE_FIXTURE = `
  mutation CreateFixture(
    $building_id: bigint!
    $floor_number: bigint!
    $type: fixture_type!
  ) {
    insert_fixtures_one(
      object: {
        building_id: $building_id
        floor_number: $floor_number
        type: $type
      }
    ) {
      id
      created_at
      building_id
      floor_number
      type
      location_on_floor
      sensor_id
    }
  }
`

export const UPDATE_FIXTURE_POSITION = `
  mutation UpdateFixturePosition($id: bigint!, $location_on_floor: jsonb, $sensor_id: bigint) {
    update_fixtures_by_pk(
      pk_columns: { id: $id }
      _set: { location_on_floor: $location_on_floor, sensor_id: $sensor_id }
    ) {
      id
      location_on_floor
      sensor_id
    }
  }
`

export const DELETE_FIXTURE = `
  mutation DeleteFixture($id: bigint!) {
    delete_fixtures_by_pk(id: $id) {
      id
    }
  }
`
