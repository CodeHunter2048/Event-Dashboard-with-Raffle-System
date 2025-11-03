/**
 * Client-side Rate Limiter
 * Tracks login attempts per IP/email to prevent brute force attacks
 */

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  lastAttempt: number;
  blockedUntil?: number;
}

class RateLimiter {
  private storage: Map<string, RateLimitEntry> = new Map();
  private readonly MAX_ATTEMPTS = 5;
  private readonly WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  private readonly BLOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

  /**
   * Check if a request should be allowed
   * @param identifier - Usually email address
   * @returns Object with isAllowed boolean and remaining attempts
   */
  checkLimit(identifier: string): { 
    isAllowed: boolean; 
    remainingAttempts: number;
    resetTime?: Date;
    blockedUntil?: Date;
  } {
    const now = Date.now();
    const entry = this.storage.get(identifier);

    // If no entry exists, allow the request
    if (!entry) {
      return { 
        isAllowed: true, 
        remainingAttempts: this.MAX_ATTEMPTS - 1 
      };
    }

    // Check if user is currently blocked
    if (entry.blockedUntil && entry.blockedUntil > now) {
      return {
        isAllowed: false,
        remainingAttempts: 0,
        blockedUntil: new Date(entry.blockedUntil)
      };
    }

    // Check if the window has expired
    if (now - entry.firstAttempt > this.WINDOW_MS) {
      // Window expired, reset
      this.storage.delete(identifier);
      return { 
        isAllowed: true, 
        remainingAttempts: this.MAX_ATTEMPTS - 1 
      };
    }

    // Check if max attempts reached
    if (entry.attempts >= this.MAX_ATTEMPTS) {
      const blockedUntil = entry.lastAttempt + this.BLOCK_DURATION_MS;
      entry.blockedUntil = blockedUntil;
      this.storage.set(identifier, entry);
      
      return {
        isAllowed: false,
        remainingAttempts: 0,
        blockedUntil: new Date(blockedUntil)
      };
    }

    return {
      isAllowed: true,
      remainingAttempts: this.MAX_ATTEMPTS - entry.attempts - 1
    };
  }

  /**
   * Record a failed login attempt
   */
  recordAttempt(identifier: string): void {
    const now = Date.now();
    const entry = this.storage.get(identifier);

    if (!entry) {
      this.storage.set(identifier, {
        attempts: 1,
        firstAttempt: now,
        lastAttempt: now
      });
    } else {
      // Check if window has expired
      if (now - entry.firstAttempt > this.WINDOW_MS) {
        // Reset the window
        this.storage.set(identifier, {
          attempts: 1,
          firstAttempt: now,
          lastAttempt: now
        });
      } else {
        // Increment attempts
        entry.attempts += 1;
        entry.lastAttempt = now;
        this.storage.set(identifier, entry);
      }
    }
  }

  /**
   * Clear attempts for a successful login
   */
  clearAttempts(identifier: string): void {
    this.storage.delete(identifier);
  }

  /**
   * Get time until reset for a blocked user
   */
  getTimeUntilReset(identifier: string): number | null {
    const entry = this.storage.get(identifier);
    if (!entry) return null;

    const now = Date.now();
    
    if (entry.blockedUntil && entry.blockedUntil > now) {
      return Math.ceil((entry.blockedUntil - now) / 1000 / 60); // minutes
    }

    const windowEnd = entry.firstAttempt + this.WINDOW_MS;
    if (windowEnd > now) {
      return Math.ceil((windowEnd - now) / 1000 / 60); // minutes
    }

    return null;
  }

  /**
   * Clean up old entries (call periodically)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.storage.entries()) {
      if (now - entry.firstAttempt > this.WINDOW_MS + this.BLOCK_DURATION_MS) {
        this.storage.delete(key);
      }
    }
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

// Clean up old entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    rateLimiter.cleanup();
  }, 5 * 60 * 1000);
}
