import { useUser } from '../contexts/UserContext';

export const useAuth = () => {
  return useUser();
};
