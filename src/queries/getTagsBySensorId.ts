export const GET_TAGS_BY_SENSOR_ID = `
  query GetTagsBySensorId($sensorId: bigint!) {
    tag(
      where: { sensor_id: { _eq: $sensorId } }
      order_by: { tagged_at: asc }
    ) {
      id
      created_at
      sensor_id
      tagged_at
      title
      description
    }
  }
`
