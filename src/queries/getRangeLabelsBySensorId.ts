export const GET_RANGE_LABELS_BY_SENSOR_ID = `
  query GetRangeLabelsBySensorId($sensorId: bigint!) {
    range_label(
      where: { sensor: { _eq: $sensorId } }
      order_by: { start_date: asc }
    ) {
      id
      created_at
      start_date
      end_date
      label
      sensor
    }
  }
`
