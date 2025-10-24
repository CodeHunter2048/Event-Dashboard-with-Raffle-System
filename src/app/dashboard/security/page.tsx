'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { analyzeCheckinData } from './actions';
import { DetectSuspiciousCheckinsOutput } from '@/ai/flows/detect-suspicious-checkins';
import { Loader2, ShieldAlert, Bot } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function SecurityPage() {
  const [analysisResult, setAnalysisResult] = useState<DetectSuspiciousCheckinsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    try {
      const result = await analyzeCheckinData();
      setAnalysisResult(result);
    } catch (e) {
      setError('Failed to run analysis. Please try again.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot /> AI-Powered Security Analysis
          </CardTitle>
          <CardDescription>
            Use our machine learning model to detect suspicious check-in patterns, such as multiple check-ins in a short time or unusual device activity. This helps ensure fair prize distribution.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleAnalysis} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Analyze Check-in Data'
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Analysis Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      )}

      {analysisResult && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
            <CardDescription>
              {analysisResult.summary}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analysisResult.flags.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Attendee ID</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Timestamp</TableHead>
                            <TableHead>Device ID</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {analysisResult.flags.map((flag, index) => (
                            <TableRow key={index}>
                                <TableCell>
                                    <Badge variant="destructive">{flag.attendeeId}</Badge>
                                </TableCell>
                                <TableCell>{flag.reason}</TableCell>
                                <TableCell>{new Date(flag.timestamp).toLocaleString()}</TableCell>
                                <TableCell>{flag.deviceId}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <div className="text-center py-10 text-muted-foreground">
                    <p>No suspicious activities detected.</p>
                </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
