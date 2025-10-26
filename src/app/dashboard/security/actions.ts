'use server';

import { detectSuspiciousCheckins, DetectSuspiciousCheckinsOutput } from '@/ai/flows/detect-suspicious-checkins';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';

interface CheckinData {
  attendeeId: string;
  timestamp: string;
  deviceId: string;
}

export async function analyzeCheckinData(): Promise<DetectSuspiciousCheckinsOutput> {
  if (!db) {
    return {
      flags: [],
      summary: 'Database not initialized. Please check Firebase configuration.'
    };
  }

  try {
    // Fetch live scan logs from Firestore
    const logsQuery = query(collection(db, 'scanlogs'), orderBy('timestamp', 'desc'));
    const logsSnapshot = await getDocs(logsQuery);
    
    const checkinData: CheckinData[] = logsSnapshot.docs.map(doc => {
      const data = doc.data();
      // Ensure timestamp is a string, converting from Firestore Timestamp if necessary
      const timestamp = data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : data.timestamp;
      return {
        attendeeId: data.attendeeId || '',
        timestamp: timestamp || new Date().toISOString(),
        deviceId: data.scannedBy || 'UNKNOWN_DEVICE', // Using scannedBy as deviceId
      };
    });

    if (checkinData.length === 0) {
      return {
        flags: [],
        summary: 'No check-in data available to analyze yet.'
      };
    }

    const input = {
      checkinData,
      eventConfiguration: {
        eventId: 'AI-IA-2024',
        expectedAttendees: 300, // This could also be fetched dynamically
      },
    };

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
