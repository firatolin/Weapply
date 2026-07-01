import apiClient from './client';
import { Scholarship } from './scholarships';

export const getFavorites = async (): Promise<Scholarship[]> => {
  const response = await apiClient.get('/favorites');
  return response.data.data;
};

export const addFavorite = async (scholarshipId: string): Promise<Scholarship> => {
  const response = await apiClient.post(`/favorites/${scholarshipId}`);
  return response.data.data;
};

export const removeFavorite = async (scholarshipId: string): Promise<void> => {
  await apiClient.delete(`/favorites/${scholarshipId}`);
};

export const checkFavorite = async (scholarshipId: string): Promise<boolean> => {
  const favorites = await getFavorites();
  return favorites.some((f) => f.id === scholarshipId);
};