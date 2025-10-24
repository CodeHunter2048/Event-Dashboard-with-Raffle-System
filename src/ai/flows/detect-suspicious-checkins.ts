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
      deviceId: z.string().describe('The ID of the device used for check-in.'),
    })
  ).describe('An array of check-in records.'),
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
  prompt: `You are an expert in fraud detection for event check-in systems. Analyze the provided check-in data for suspicious patterns and generate a summary of your findings. Flag any activity that seems potentially fraudulent.

Check-in Data:
{{#each checkinData}}
  - Attendee ID: {{this.attendeeId}}, Timestamp: {{this.timestamp}}, Device ID: {{this.deviceId}}
{{/each}}

Event Configuration:
- Event ID: {{eventConfiguration.eventId}}
- Expected Attendees: {{eventConfiguration.expectedAttendees}}

Consider the following:
- Multiple check-ins from the same attendee within a short period.
- Unusual spikes in check-in activity from a single device.
- Check-ins occurring outside of expected event hours.
- Large number of check-ins from same person

Output a summary of suspicious activity along with specific flags for each instance, including the attendee ID, reason for suspicion, timestamp, and device ID. Adhere to the schema descriptions for each field.

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
