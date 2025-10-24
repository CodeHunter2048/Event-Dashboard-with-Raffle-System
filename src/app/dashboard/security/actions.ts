'use server';

import { detectSuspiciousCheckins, DetectSuspiciousCheckinsOutput } from '@/ai/flows/detect-suspicious-checkins';
import { checkInHistory } from '@/lib/data';

export async function analyzeCheckinData(): Promise<DetectSuspiciousCheckinsOutput> {
  // In a real app, you would fetch this from your database
  const input = {
    checkinData: checkInHistory,
    eventConfiguration: {
      eventId: 'AI-IA-2024',
      expectedAttendees: 300,
    },
  };

  try {
    const result = await detectSuspiciousCheckins(input);
    return result;
  } catch (error) {
    console.error('Error analyzing check-in data:', error);
    // Return a structured error response
    return {
      flags: [],
      summary: 'An error occurred while analyzing the data. Please check the server logs.'
    };
  }
}
