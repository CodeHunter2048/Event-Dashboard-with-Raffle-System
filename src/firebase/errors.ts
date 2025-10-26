export type SecurityRuleContext = {
    path: string;
    operation: 'get' | 'list' | 'create' | 'update' | 'delete';
    requestResourceData?: any;
  };
  
  export class FirestorePermissionError extends Error {
    constructor(public context: SecurityRuleContext) {
      super(`Firestore Permission Denied: The following request was denied by Firestore Security Rules:\n${JSON.stringify(context, null, 2)}`);
      this.name = 'FirestorePermissionError';
      
      // This is to ensure the stack trace is captured correctly
      if (typeof (Error as any).captureStackTrace === 'function') {
        (Error as any).captureStackTrace(this, FirestorePermissionError);
      }
    }
  
    public toString(): string {
      return this.message;
    }
  }
  