import { useUser } from '@/lib/contexts/UserContext';

export const useAuth = () => {
  return useUser();
};
