import api from './api'
import { API_ENDPOINTS } from '@config/api'
import type { ImportedRecipe, ImportUsage, Recipe, RecipeInput } from '@app-types/kochbuch'

export const kochbuchService = {
  listRecipes: (params?: { search?: string; tag?: string }) =>
    api.get<{ recipes: Recipe[] }>(API_ENDPOINTS.kochbuch.recipes, { params }),

  listTags: () => api.get<{ tags: string[] }>(API_ENDPOINTS.kochbuch.tags),

  createRecipe: (input: RecipeInput) => api.post<{ recipe: Recipe }>(API_ENDPOINTS.kochbuch.recipes, input),

  updateRecipe: (id: string, input: Partial<RecipeInput>) =>
    api.put<{ recipe: Recipe }>(API_ENDPOINTS.kochbuch.recipe(id), input),

  deleteRecipe: (id: string) => api.delete(API_ENDPOINTS.kochbuch.recipe(id)),

  uploadRecipePhoto: (id: string, file: File) => {
    const formData = new FormData()
    formData.append('photo', file)
    return api.post<{ recipe: Recipe }>(API_ENDPOINTS.kochbuch.recipePhoto(id), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  uploadStepPhoto: (id: string, stepIndex: number, file: File) => {
    const formData = new FormData()
    formData.append('photo', file)
    return api.post<{ recipe: Recipe }>(API_ENDPOINTS.kochbuch.stepPhoto(id, stepIndex), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  rateRecipe: (id: string, value: number | null) =>
    api.put<{ recipe: Recipe }>(API_ENDPOINTS.kochbuch.recipeRating(id), { value }),

  importStatus: () => api.get<{ configured: boolean }>(API_ENDPOINTS.kochbuch.importStatus),

  analyzeImport: (front: File, back: File) => {
    const formData = new FormData()
    formData.append('front', front)
    formData.append('back', back)
    return api.post<{ recipe: ImportedRecipe; usage: ImportUsage }>(API_ENDPOINTS.kochbuch.importAnalyze, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
