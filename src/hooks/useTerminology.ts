import { useAuth } from '../contexts/AuthContext';
import { getTerminology, Terminology } from '../utils/terminology';

export function useTerminology(): Terminology {
  const { tenant } = useAuth();
  const businessType = (tenant?.settings as any)?.business_type || 'hotel';
  return getTerminology(businessType);
}
