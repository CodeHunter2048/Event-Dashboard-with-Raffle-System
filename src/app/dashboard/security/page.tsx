'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { analyzeCheckinData } from './actions';
import { DetectSuspiciousCheckinsOutput } from '@/ai/flows/detect-suspicious-checkins';
import { Loader2, ShieldAlert, Bot, ChevronDown, ChevronUp, AlertTriangle, RotateCcw } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, getDocs, writeBatch, updateDoc, doc } from 'firebase/firestore';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ScanLog {
  id: string;
  attendeeId: string;
  attendeeName: string;
  scannedBy: string;
  timestamp: any;
  action: string;
}

interface LoginLog {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  timestamp: any;
  action: string;
}

interface AnalysisResult {
  id: string;
  summary: string;
  flags: Array<{
    attendeeId: string;
    reason: string;
    timestamp: string;
    deviceId: string;
  }>;
  analyzedAt: any;
  totalScans: number;
  totalLogins: number;
}

export default function SecurityPage() {
  const { toast } = useToast();
  const [analysisResult, setAnalysisResult] = useState<DetectSuspiciousCheckinsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [savedAnalyses, setSavedAnalyses] = useState<AnalysisResult[]>([]);
  const [expandedAnalysis, setExpandedAnalysis] = useState<string | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Fetch scan logs in real-time
  useEffect(() => {
    if (!db) return;

    const scanLogsRef = collection(db, 'scanlogs');
    const q = query(scanLogsRef, orderBy('timestamp', 'desc'), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          attendeeId: data.attendeeId || '',
          attendeeName: data.attendeeName || '',
          scannedBy: data.scannedBy || 'Unknown',
          timestamp: data.timestamp,
          action: data.action || '',
        } as ScanLog;
      });
      setScanLogs(logs);
    }, (error) => {
      console.error('Error fetching scan logs:', error);
    });

    return () => unsubscribe();
  }, []);

  // Fetch login logs in real-time
  useEffect(() => {
    if (!db) return;

    const loginLogsRef = collection(db, 'loginlogs');
    const q = query(loginLogsRef, orderBy('timestamp', 'desc'), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId || '',
          email: data.email || '',
          displayName: data.displayName || '',
          timestamp: data.timestamp,
          action: data.action || '',
        } as LoginLog;
      });
      setLoginLogs(logs);
    }, (error) => {
      console.error('Error fetching login logs:', error);
    });

    return () => unsubscribe();
  }, []);

  // Fetch saved analysis results
  useEffect(() => {
    if (!db) return;

    const analysisRef = collection(db, 'analysis_results');
    const q = query(analysisRef, orderBy('analyzedAt', 'desc'), limit(20));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const analyses = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          summary: data.summary || '',
          flags: data.flags || [],
          analyzedAt: data.analyzedAt,
          totalScans: data.totalScans || 0,
          totalLogins: data.totalLogins || 0,
        } as AnalysisResult;
      });
      setSavedAnalyses(analyses);
    }, (error) => {
      console.error('Error fetching analysis results:', error);
    });

    return () => unsubscribe();
  }, []);

  const handleAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    try {
      const result = await analyzeCheckinData();
      setAnalysisResult(result);
      
      // Save analysis result to Firestore
      if (db) {
        try {
          await addDoc(collection(db, 'analysis_results'), {
            summary: result.summary,
            flags: result.flags,
            analyzedAt: serverTimestamp(),
            totalScans: scanLogs.length,
            totalLogins: loginLogs.length,
          });
          
          toast({
            title: 'Analysis Complete',
            description: 'Security analysis has been saved successfully.',
          });
        } catch (saveError) {
          console.error('Error saving analysis:', saveError);
          toast({
            variant: 'destructive',
            title: 'Save Failed',
            description: 'Analysis completed but failed to save to database.',
          });
        }
      }
    } catch (e) {
      setError('Failed to run analysis. Please try again.');
      console.error(e);
      toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: 'Could not complete the security analysis.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetCheckIns = async () => {
    if (!db) return;
    
    setIsResetting(true);
    try {
      let attendeeCount = 0;
      let winnerCount = 0;
      let scanLogCount = 0;
      
      // Reset attendees check-in status
      const attendeesSnapshot = await getDocs(collection(db, 'attendees'));
      const attendeeBatch = writeBatch(db);
      
      attendeesSnapshot.forEach((attendeeDoc) => {
        attendeeBatch.update(attendeeDoc.ref, {
          checkedIn: false,
          checkInTime: null
        });
        attendeeCount++;
      });
      
      await attendeeBatch.commit();
      
      // Delete all winners
      const winnersSnapshot = await getDocs(collection(db, 'winners'));
      const winnerBatch = writeBatch(db);
      
      winnersSnapshot.forEach((winnerDoc) => {
        winnerBatch.delete(winnerDoc.ref);
        winnerCount++;
      });
      
      if (winnerCount > 0) {
        await winnerBatch.commit();
      }
      
      // Delete all scan logs
      const scanLogsSnapshot = await getDocs(collection(db, 'scanlogs'));
      const scanLogBatch = writeBatch(db);
      
      scanLogsSnapshot.forEach((scanLogDoc) => {
        scanLogBatch.delete(scanLogDoc.ref);
        scanLogCount++;
      });
      
      if (scanLogCount > 0) {
        await scanLogBatch.commit();
      }
      
      toast({
        title: 'Success',
        description: `Reset complete: ${attendeeCount} check-ins, ${winnerCount} winners, and ${scanLogCount} scan logs cleared.`,
      });
      
      setResetDialogOpen(false);
    } catch (error: any) {
      console.error('Error resetting data:', error);
      toast({
        variant: 'destructive',
        title: 'Reset Failed',
        description: error.message || 'Failed to reset check-in records.',
      });
    } finally {
      setIsResetting(false);
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
          <div className="flex gap-2">
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
            <Button 
              onClick={() => setResetDialogOpen(true)} 
              disabled={isResetting}
              variant="destructive"
            >
              {isResetting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset Check-ins
                </>
              )}
            </Button>
          </div>
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
            <CardTitle>Latest Analysis Results</CardTitle>
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

      {/* Saved Analysis History */}
      {savedAnalyses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis History</CardTitle>
            <CardDescription>
              Previous security analyses (click to expand)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {savedAnalyses.map((analysis) => (
                <Collapsible
                  key={analysis.id}
                  open={expandedAnalysis === analysis.id}
                  onOpenChange={(isOpen) => setExpandedAnalysis(isOpen ? analysis.id : null)}
                >
                  <div className="border rounded-lg">
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3 text-left flex-1">
                          {analysis.flags.length > 0 ? (
                            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
                          ) : (
                            <ShieldAlert className="h-5 w-5 text-green-500 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {analysis.summary.length > 100 
                                ? `${analysis.summary.substring(0, 100)}...` 
                                : analysis.summary}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 flex gap-3">
                              <span>
                                {analysis.analyzedAt ? (
                                  (() => {
                                    try {
                                      const date = typeof analysis.analyzedAt.toDate === 'function' 
                                        ? analysis.analyzedAt.toDate() 
                                        : new Date(analysis.analyzedAt);
                                      return date.toLocaleString();
                                    } catch (e) {
                                      return 'Invalid Date';
                                    }
                                  })()
                                ) : 'N/A'}
                              </span>
                              <span>•</span>
                              <span>{analysis.totalScans} scans</span>
                              <span>•</span>
                              <span>{analysis.totalLogins} logins</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {analysis.flags.length > 0 && (
                            <Badge variant="destructive">
                              {analysis.flags.length} flag{analysis.flags.length !== 1 ? 's' : ''}
                            </Badge>
                          )}
                          {expandedAnalysis === analysis.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t p-4 bg-muted/20">
                        <div className="mb-3">
                          <h4 className="font-medium text-sm mb-2">Full Summary:</h4>
                          <p className="text-sm text-muted-foreground">{analysis.summary}</p>
                        </div>
                        
                        {analysis.flags.length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm mb-2">Flagged Activities:</h4>
                            <div className="space-y-2">
                              {analysis.flags.map((flag, index) => (
                                <div key={index} className="border rounded-lg p-3 bg-background">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <Badge variant="destructive" className="text-xs">
                                      {flag.attendeeId}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(flag.timestamp).toLocaleString()}
                                    </span>
                                  </div>
                                  <p className="text-sm mt-2">{flag.reason}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Device/Scanner: {flag.deviceId}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logs Section - Side by Side */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Scan Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Scan Logs</CardTitle>
            <CardDescription>
              Real-time log of all check-in scans monitored by the AI system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {scanLogs.length > 0 ? (
              <div className="space-y-3">
                {scanLogs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{log.attendeeName}</span>
                      <Badge variant={
                        log.action === 'checked-in' ? 'default' : 
                        log.action === 'already-checked-in' ? 'secondary' : 
                        'destructive'
                      } className="text-xs">
                        {log.action}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div>ID: <code className="bg-muted px-1 py-0.5 rounded">{log.attendeeId.substring(0, 12)}...</code></div>
                      <div>Scanner: {log.scannedBy}</div>
                      <div>
                        {log.timestamp ? (
                          (() => {
                            try {
                              const date = typeof log.timestamp.toDate === 'function' 
                                ? log.timestamp.toDate() 
                                : new Date(log.timestamp);
                              return date.toLocaleString();
                            } catch (e) {
                              return 'Invalid Date';
                            }
                          })()
                        ) : 'N/A'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <p>No scan logs available yet.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Login Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Login Logs</CardTitle>
            <CardDescription>
              Real-time log of all user logins monitored by the AI system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loginLogs.length > 0 ? (
              <div className="space-y-3">
                {loginLogs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{log.displayName || 'Unknown User'}</span>
                      <Badge variant={log.action === 'login' ? 'default' : 'secondary'} className="text-xs">
                        {log.action}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div>Email: {log.email}</div>
                      <div>
                        {log.timestamp ? (
                          (() => {
                            try {
                              const date = typeof log.timestamp.toDate === 'function' 
                                ? log.timestamp.toDate() 
                                : new Date(log.timestamp);
                              return date.toLocaleString();
                            } catch (e) {
                              return 'Invalid Date';
                            }
                          })()
                        ) : 'N/A'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <p>No login logs available yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reset Check-ins Confirmation Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset All Check-ins, Winners & Logs?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all check-in records for all attendees, delete all winner records, and clear all scan logs. This action is typically used to clear test data before the actual event. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetCheckIns}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reset All Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
