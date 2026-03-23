export const RETRAIN_MODELS = `
  mutation RetrainModels {
    retrain_models {
      modelsCount
      fixtureTypes
      totalSequences
      error
    }
  }
`
