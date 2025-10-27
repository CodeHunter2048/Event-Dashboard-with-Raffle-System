'use server';

import { detectSuspiciousCheckins, DetectSuspiciousCheckinsOutput } from '@/ai/flows/detect-suspicious-checkins';
import { adminDb } from '@/lib/firebase-admin';

interface CheckinData {
  attendeeId: string;
  timestamp: string;
  deviceId: string;
}

interface LoginData {
  userId: string;
  email: string;
  displayName: string;
  timestamp: string;
  action: string;
}

export async function analyzeCheckinData(): Promise<DetectSuspiciousCheckinsOutput> {
  try {
    // Fetch live scan logs from Firestore using Admin SDK
    const logsSnapshot = await adminDb
      .collection('scanlogs')
      .orderBy('timestamp', 'desc')
      .limit(500)
      .get();
    
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

    // Fetch login logs from Firestore using Admin SDK
    const loginLogsSnapshot = await adminDb
      .collection('loginlogs')
      .orderBy('timestamp', 'desc')
      .limit(500)
      .get();
    
    const loginData: LoginData[] = loginLogsSnapshot.docs.map(doc => {
      const data = doc.data();
      const timestamp = data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : data.timestamp;
      return {
        userId: data.userId || '',
        email: data.email || '',
        displayName: data.displayName || '',
        timestamp: timestamp || new Date().toISOString(),
        action: data.action || '',
      };
    });

    if (checkinData.length === 0 && loginData.length === 0) {
      return {
        flags: [],
        summary: 'No check-in or login data available to analyze yet.'
      };
    }

    const input = {
      checkinData,
      loginData,
      eventConfiguration: {
        eventId: 'AI-IA-2024',
        expectedAttendees: 300, // This could also be fetched dynamically
      },
    };

    const result = await detectSuspiciousCheckins(input);
    return result;
  } catch (error) {
    console.error('Error analyzing check-in data:', error);
    // Return a structured error response with actual error details
    return {
      flags: [],
      summary: `Error analyzing data: ${error instanceof Error ? error.message : 'Unknown error occurred'}. Please check the server logs for details.`
    };
  }
}
