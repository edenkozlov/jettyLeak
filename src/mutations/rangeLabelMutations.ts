export const INSERT_RANGE_LABEL = `
  mutation InsertRangeLabel($sensor: bigint!, $start_date: timestamptz!, $end_date: timestamptz!, $label: String!) {
    insert_range_label_one(object: { sensor: $sensor, start_date: $start_date, end_date: $end_date, label: $label }) {
      id
      created_at
      start_date
      end_date
      label
      sensor
    }
  }
`

export const DELETE_RANGE_LABEL = `
  mutation DeleteRangeLabel($id: bigint!) {
    delete_range_label_by_pk(id: $id) {
      id
    }
  }
`
