import apiClient from './client';

export interface EmployeeStats {
  stats: {
    myScholarships: number;
    pendingReviews: number;
    applications: number;
    totalScholarships: number;
    verifiedScholarships: number;
  };
  recentScholarships: any[];
  allScholarships: any[];
}

export const getEmployeeStats = async (): Promise<EmployeeStats> => {
  const response = await apiClient.get('/employee/stats');
  return response.data.data;
};