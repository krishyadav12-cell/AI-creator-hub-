import { useState } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { UserProfile, PLAN_LIMITS, Plan } from '../types';

export function useUsage(profile: UserProfile | null) {
  const [checking, setChecking] = useState(false);

  const checkLimit = async () => {
    if (!profile) return false;
    
    setChecking(true);
    try {
      const limit = PLAN_LIMITS[profile.plan as Plan] || 3;
      
      // Check if reset is needed (daily)
      const now = new Date();
      const lastReset = profile.lastDailyReset?.toDate() || new Date(0);
      const isNewDay = now.toDateString() !== lastReset.toDateString();

      if (isNewDay) {
        await updateDoc(doc(db, 'users', profile.uid), {
          dailyUsageCount: 1,
          lastDailyReset: serverTimestamp()
        });
        return true;
      }

      if (profile.dailyUsageCount >= limit) {
        return false;
      }

      // Increment usage
      await updateDoc(doc(db, 'users', profile.uid), {
        dailyUsageCount: increment(1)
      });
      return true;
    } catch (error) {
      console.error('Usage check error:', error);
      return false;
    } finally {
      setChecking(false);
    }
  };

  return { checkLimit, checking };
}
