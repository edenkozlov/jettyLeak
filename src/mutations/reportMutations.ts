export const CREATE_REPORT = `
  mutation CreateReport(
    $sensor_id: bigint
    $flow_value: float8
    $temp_value: float8
  ) {
    insert_report_one(
      object: {
        sensor_id: $sensor_id
        flow_value: $flow_value
        temp_value: $temp_value
      }
    ) {
      id
      created_at
      sensor_id
      flow_value
      temp_value
    }
  }
`

export const DELETE_REPORT = `
  mutation DeleteReport($id: bigint!) {
    delete_report_by_pk(id: $id) {
      id
    }
  }
`
