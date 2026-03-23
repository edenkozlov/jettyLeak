export const INSERT_SIGNAL = `
  mutation InsertSignal(
    $sensor_id: bigint!
    $start_time: timestamptz!
    $end_time: timestamptz!
    $value: String!
    $time: timestamptz!
  ) {
    insert_signal_one(
      object: {
        sensor_id: $sensor_id
        start_time: $start_time
        end_time: $end_time
        value: $value
        time: $time
      }
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

export const DELETE_SIGNAL = `
  mutation DeleteSignal($id: bigint!) {
    delete_signal_by_pk(id: $id) {
      id
    }
  }
`

export const UPDATE_PREDICTED_SIGNAL = `
  mutation UpdatePredictedSignal($id: bigint!, $prediction: String!) {
    update_predicted_signal_by_pk(
      pk_columns: { id: $id }
      _set: { prediction: $prediction }
    ) {
      id
      prediction
    }
  }
`
