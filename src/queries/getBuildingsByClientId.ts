export const GET_BUILDINGS_BY_CLIENT_ID = `
  query GetBuildingsByClientId($clientId: uuid!) {
    building(
      where: { client_id: { _eq: $clientId } }
      order_by: { created_at: desc }
    ) {
      id
      created_at
      name
      full_address
      latitude
      longitude
      client_id
    }
  }
`
