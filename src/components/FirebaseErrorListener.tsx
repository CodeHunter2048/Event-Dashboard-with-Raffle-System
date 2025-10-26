'use client';

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: any) => {
      console.error("Caught a firebase permission error", error.toString());
      const friendlyMessage = error.message.split('\n')[0];
      
      toast({
        variant: 'destructive',
        title: 'Permission Error',
        description: friendlyMessage,
        duration: 10000, 
      });
      throw error;
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast]);

  return null;
}
