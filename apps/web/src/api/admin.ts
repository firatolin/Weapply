import apiClient from './client';

export interface AdminStats {
  stats: {
    totalUsers: number;
    activeUsers: number;
    totalScholarships: number;
    verifiedScholarships: number;
    totalFavorites: number;
    pendingScholarships: number;
  };
  recentUsers: any[];
  recentScholarships: any[];
  roleDistribution: any[];
  scholarshipStatus: {
    verified: number;
    pending: number;
    total: number;
  };
}

export const getAdminStats = async (): Promise<AdminStats> => {
  const response = await apiClient.get('/admin/stats');
  return response.data.data;
};

export const getAdminUsers = async (page: number = 1, limit: number = 10, search: string = '', role: string = '') => {
  const response = await apiClient.get('/admin/users', {
    params: { page, limit, search, role },
  });
  return response.data;
};

export const updateUserRole = async (userId: string, role: string) => {
  const response = await apiClient.put(`/admin/users/${userId}/role`, { role });
  return response.data;
};

export const deleteUser = async (userId: string) => {
  const response = await apiClient.delete(`/admin/users/${userId}`);
  return response.data;
};