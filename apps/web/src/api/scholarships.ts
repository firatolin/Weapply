import apiClient from './client';

export interface Scholarship {
  id: string;
  name: string;
  description?: string;
  provider: string;
  providerType: string;
  scholarshipType: string;
  amountCurrency: string;
  amountMin?: number;
  amountMax?: number;
  applicationDeadline?: string;
  applicationURL?: string;
  targetFields: string[];
  targetCountries: string[];
  targetNationalities: string[];
  educationLevels: string[];
  isVerified: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface ScholarshipResponse {
  data: Scholarship[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const getScholarships = async (
  page = 1,
  limit = 10,
  search = '',
  sortBy = 'createdAt',
  sortOrder = 'desc'
): Promise<ScholarshipResponse> => {
  const response = await apiClient.get('/scholarships', {
    params: {
      page,
      limit,
      search,
      sortBy,
      sortOrder,
    },
  });
  return response.data;
};

export const getScholarshipById = async (id: string): Promise<Scholarship> => {
  const response = await apiClient.get(`/scholarships/${id}`);
  return response.data.data;
};

export const createScholarship = async (data: any): Promise<Scholarship> => {
  const response = await apiClient.post('/scholarships', data);
  return response.data.data;
};

export const updateScholarship = async (id: string, data: any): Promise<Scholarship> => {
  const response = await apiClient.put(`/scholarships/${id}`, data);
  return response.data.data;
};

export const deleteScholarship = async (id: string): Promise<void> => {
  await apiClient.delete(`/scholarships/${id}`);
};
export const getPendingScholarships = async (page = 1, limit = 10) => {
  const response = await apiClient.get('/scholarships/pending', {
    params: { page, limit },
  });
  return response.data;
};

export const verifyScholarship = async (id: string, verified: boolean) => {
  const response = await apiClient.put(`/scholarships/${id}/verify`, { verified });
  return response.data;
};
