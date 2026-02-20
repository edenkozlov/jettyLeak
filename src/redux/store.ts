import { configureStore } from '@reduxjs/toolkit'

import loginReducer from './loginSlice'

export const store = configureStore({
  reducer: { login: loginReducer },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
