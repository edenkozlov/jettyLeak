export const GET_LABELS = `
  query GetLabels {
    signal(
      where: {
        value: { _is_null: false }
        start_time: { _is_null: false }
        end_time: { _is_null: false }
      }
      order_by: { created_at: desc }
      limit: 100
    ) {
      id
      value
      start_time
      end_time
      sensor_id
      created_at
      sensor { name }
    }
  }
`
