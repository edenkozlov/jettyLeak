export const GET_PREDICTED_SIGNALS = `
  query GetPredictedSignals($limit: Int!, $where: predicted_signal_bool_exp) {
    predicted_signal(where: $where, order_by: { created_at: desc }, limit: $limit) {
      id
      created_at
      start_time
      end_time
      prediction
      sensor_id
      sensor {
        name
        building { name }
      }
    }
  }
`

export const GET_PREDICTED_SIGNALS_BY_SENSOR = `
  query GetPredictedSignalsBySensor($limit: Int!, $sensorId: bigint!) {
    predicted_signal(
      where: { sensor_id: { _eq: $sensorId } }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      id
      created_at
      start_time
      end_time
      prediction
      sensor_id
      sensor {
        name
        building { name }
      }
    }
  }
`
