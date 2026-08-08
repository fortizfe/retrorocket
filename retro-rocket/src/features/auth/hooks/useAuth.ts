import { useUser } from '@/lib/contexts/useUserContext';

export const useAuth = () => {
  return useUser();
};
