import apiClient from './client';

export interface AuthUser {
  id: string;
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  photoURL?: string;
  profile?: {
    id: string;
    firstName?: string;
    lastName?: string;
    nationality?: string;
    countryOfResidence?: string;
    educationLevel?: string;
    fieldsOfInterest: string[];
  };
}

export const syncUser = async (token: string): Promise<AuthUser> => {
  console.log('🔄 Syncing user with backend...');
  try {
    const response = await apiClient.post('/auth/sync', { token });
    console.log('✅ User synced successfully:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Sync failed:', error);
    throw error;
  }
};

export const getCurrentUser = async (): Promise<AuthUser> => {
  const response = await apiClient.get('/auth/me');
  return response.data.data;
};

export const updateProfile = async (data: {
  displayName?: string;
  photoURL?: string;
}): Promise<AuthUser> => {
  const response = await apiClient.put('/auth/profile', data);
  return response.data.data;
};
