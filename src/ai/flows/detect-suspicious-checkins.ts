'use server';

/**
 * @fileOverview An AI agent that detects suspicious check-in patterns during an event.
 *
 * - detectSuspiciousCheckins - A function that analyzes check-in data and flags suspicious activity.
 * - DetectSuspiciousCheckinsInput - The input type for the detectSuspiciousCheckins function.
 * - DetectSuspiciousCheckinsOutput - The return type for the detectSuspiciousCheckins function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetectSuspiciousCheckinsInputSchema = z.object({
  checkinData: z.array(
    z.object({
      attendeeId: z.string().describe('The unique identifier of the attendee.'),
      timestamp: z.string().describe('The timestamp of the check-in event.'),
      deviceId: z.string().describe('The ID of the device/scanner used for check-in.'),
    })
  ).describe('An array of check-in records from scan logs.'),
  loginData: z.array(
    z.object({
      userId: z.string().describe('The unique identifier of the user who logged in.'),
      email: z.string().describe('The email address of the user.'),
      displayName: z.string().describe('The display name of the user.'),
      timestamp: z.string().describe('The timestamp of the login event.'),
      action: z.string().describe('The action performed (e.g., login, logout).'),
    })
  ).optional().describe('An array of login records from login logs.'),
  eventConfiguration: z.object({
    eventId: z.string().describe('The ID of the event.'),
    expectedAttendees: z.number().describe('The total number of expected attendees.'),
  }).describe('Event configuration details.'),
});

export type DetectSuspiciousCheckinsInput = z.infer<typeof DetectSuspiciousCheckinsInputSchema>;

const SuspiciousActivitySchema = z.object({
  attendeeId: z.string().describe('The unique identifier of the attendee involved in suspicious activity.'),
  reason: z.string().describe('The reason for flagging the activity as suspicious.'),
  timestamp: z.string().describe('The timestamp of the suspicious activity.'),
  deviceId: z.string().describe('The ID of the device used during the suspicious activity.'),
});

const DetectSuspiciousCheckinsOutputSchema = z.object({
  flags: z.array(SuspiciousActivitySchema).describe('An array of suspicious activity flags.'),
  summary: z.string().describe('A summary of the analysis and any identified suspicious patterns.'),
});

export type DetectSuspiciousCheckinsOutput = z.infer<typeof DetectSuspiciousCheckinsOutputSchema>;

export async function detectSuspiciousCheckins(
  input: DetectSuspiciousCheckinsInput
): Promise<DetectSuspiciousCheckinsOutput> {
  return detectSuspiciousCheckinsFlow(input);
}

const detectSuspiciousCheckinsPrompt = ai.definePrompt({
  name: 'detectSuspiciousCheckinsPrompt',
  input: {schema: DetectSuspiciousCheckinsInputSchema},
  output: {schema: DetectSuspiciousCheckinsOutputSchema},
  prompt: `You are an expert in fraud detection and security analysis for event check-in systems. Analyze the provided check-in data and login logs for suspicious patterns and generate a summary of your findings. Flag any activity that seems potentially fraudulent or abnormal.

Check-in Data (Scan Logs):
{{#each checkinData}}
  - Attendee ID: {{this.attendeeId}}, Timestamp: {{this.timestamp}}, Scanner/Device: {{this.deviceId}}
{{/each}}

{{#if loginData}}
Login Data (Login Logs):
{{#each loginData}}
  - User: {{this.displayName}} ({{this.email}}), User ID: {{this.userId}}, Action: {{this.action}}, Timestamp: {{this.timestamp}}
{{/each}}
{{/if}}

Event Configuration:
- Event ID: {{eventConfiguration.eventId}}
- Expected Attendees: {{eventConfiguration.expectedAttendees}}

Analyze for the following suspicious patterns:

**Check-in Analysis:**
- Multiple check-ins from the same attendee within a short period (possible duplicate scanning)
- Unusual spikes in check-in activity from a single scanner/device (possible bulk fraudulent check-ins)
- Check-ins occurring outside of expected event hours
- Same person checking in repeatedly
- Patterns suggesting automated or scripted check-ins

**Login Analysis:**
- Multiple login attempts from the same account in quick succession
- Login patterns suggesting unauthorized access attempts
- Unusual login times (e.g., middle of the night for a daytime event)
- Correlation between suspicious login activity and suspicious check-in patterns (same user/scanner)

**Cross-Analysis:**
- Correlation between login events and check-in spikes (e.g., a user logs in and immediately performs many check-ins)
- Identify if certain scanners/users are associated with suspicious check-in patterns

Output a comprehensive summary of suspicious activity along with specific flags for each instance. For each flag, include:
- The attendeeId (or userId for login-related flags)
- Clear reason for suspicion
- Timestamp of the suspicious activity
- DeviceId (scanner name/user who performed the action)

Be thorough but avoid false positives. Only flag truly suspicious patterns.

Format your output as JSON according to the DetectSuspiciousCheckinsOutputSchema schema.
`,
});

const detectSuspiciousCheckinsFlow = ai.defineFlow(
  {
    name: 'detectSuspiciousCheckinsFlow',
    inputSchema: DetectSuspiciousCheckinsInputSchema,
    outputSchema: DetectSuspiciousCheckinsOutputSchema,
  },
  async input => {
    const {output} = await detectSuspiciousCheckinsPrompt(input);
    return output!;
  }
);
