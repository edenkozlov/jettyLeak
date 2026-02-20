export const GET_CLIENT_BY_ID = `
  query GetClientById($id: uuid!) {
    client_by_pk(id: $id) {
      id
      created_at
      email
      first_name
      last_name
      buildings {
        id
        name
        full_address
      }
    }
  }
`
