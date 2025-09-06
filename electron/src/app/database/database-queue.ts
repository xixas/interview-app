import { EventEmitter } from 'events';

export interface DatabaseOperation<T = any> {
  id: string;
  operation: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timestamp: number;
  timeout?: number;
}

export class DatabaseQueue extends EventEmitter {
  private queue: Array<DatabaseOperation> = [];
  private processing = false;
  private currentOperation: DatabaseOperation | null = null;
  private statistics = {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    averageExecutionTime: 0,
    queueLength: 0
  };

  constructor(private maxRetries = 3, private defaultTimeout = 30000) {
    super();
    this.startMetricsReporting();
  }

  /**
   * Execute a database operation with queue management
   */
  async execute<T>(
    operation: () => Promise<T>,
    timeout?: number,
    priority = false
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const operationId = this.generateOperationId();
      console.log(`[DB-QUEUE] Creating operation ${operationId} with timeout ${timeout || this.defaultTimeout}ms`);
      
      const databaseOp: DatabaseOperation<T> = {
        id: operationId,
        operation,
        resolve: resolve as (value: any) => void,
        reject,
        timestamp: Date.now(),
        timeout: timeout || this.defaultTimeout
      };

      // Add to queue (priority operations go to front)
      if (priority) {
        console.log(`[DB-QUEUE] Adding priority operation ${operationId} to front of queue`);
        this.queue.unshift(databaseOp);
      } else {
        console.log(`[DB-QUEUE] Adding operation ${operationId} to end of queue`);
        this.queue.push(databaseOp);
      }

      this.statistics.queueLength = this.queue.length;
      console.log(`[DB-QUEUE] Queue length is now: ${this.queue.length}`);
      this.emit('operation:queued', { id: operationId, queueLength: this.queue.length });

      // Start processing if not already running
      console.log(`[DB-QUEUE] Starting queue processing (currently processing: ${this.processing})`);
      this.processQueue();
    });
  }

  /**
   * Process the queue of database operations
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const operation = this.queue.shift()!;
      this.currentOperation = operation;
      this.statistics.queueLength = this.queue.length;

      try {
        await this.executeWithTimeout(operation);
      } catch (error) {
        // Error is already handled in executeWithTimeout
      } finally {
        this.currentOperation = null;
      }
    }

    this.processing = false;
    this.emit('queue:empty');
  }

  /**
   * Execute a single operation with timeout and retry logic
   */
  private async executeWithTimeout(operation: DatabaseOperation): Promise<void> {
    const startTime = Date.now();
    let lastError: Error | null = null;
    
    console.log(`[DB-QUEUE] executeWithTimeout started for operation ${operation.id}, timeout: ${operation.timeout}ms`);

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`[DB-QUEUE] Attempt ${attempt}/${this.maxRetries} for operation ${operation.id}`);
        
        this.emit('operation:started', { 
          id: operation.id, 
          attempt,
          maxAttempts: this.maxRetries 
        });

        // Create a timeout promise
        console.log(`[DB-QUEUE] Setting up timeout promise for ${operation.timeout}ms`);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            console.log(`[DB-QUEUE] Timeout triggered for operation ${operation.id} after ${operation.timeout}ms`);
            reject(new Error(`Database operation timeout after ${operation.timeout}ms`));
          }, operation.timeout);
        });

        // Race between operation and timeout
        console.log(`[DB-QUEUE] Starting operation race for ${operation.id}...`);
        const result = await Promise.race([
          operation.operation(),
          timeoutPromise
        ]);

        // Success!
        const executionTime = Date.now() - startTime;
        console.log(`[DB-QUEUE] Operation ${operation.id} succeeded in ${executionTime}ms`);
        this.updateStatistics(true, executionTime);
        
        this.emit('operation:completed', { 
          id: operation.id, 
          executionTime,
          attempt 
        });

        operation.resolve(result);
        return;

      } catch (error) {
        lastError = error as Error;
        console.log(`[DB-QUEUE] Operation ${operation.id} failed on attempt ${attempt}:`, error.message);
        
        this.emit('operation:failed', { 
          id: operation.id, 
          attempt, 
          error: lastError.message 
        });

        // Check if this is a database lock error that we should retry
        if (this.isRetryableError(lastError) && attempt < this.maxRetries) {
          const backoffDelay = this.calculateBackoffDelay(attempt);
          console.warn(`Database operation ${operation.id} failed (attempt ${attempt}/${this.maxRetries}), retrying in ${backoffDelay}ms:`, lastError.message);
          
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          continue;
        }

        // Max retries reached or non-retryable error
        break;
      }
    }

    // All retries failed
    const executionTime = Date.now() - startTime;
    this.updateStatistics(false, executionTime);
    
    this.emit('operation:exhausted', { 
      id: operation.id, 
      error: lastError?.message 
    });

    operation.reject(lastError || new Error('Unknown database operation error'));
  }

  /**
   * Check if an error is retryable (SQLite lock, busy, etc.)
   */
  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('database is locked') ||
      message.includes('database is busy') ||
      message.includes('sqlite_busy') ||
      message.includes('sqlite_locked') ||
      message.includes('cannot start a transaction') ||
      message.includes('disk i/o error')
    );
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateBackoffDelay(attempt: number): number {
    const baseDelay = 100; // 100ms base
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const maxDelay = 5000; // Maximum 5 seconds
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
    
    return Math.min(exponentialDelay + jitter, maxDelay);
  }

  /**
   * Update operation statistics
   */
  private updateStatistics(success: boolean, executionTime: number): void {
    this.statistics.totalOperations++;
    
    if (success) {
      this.statistics.successfulOperations++;
    } else {
      this.statistics.failedOperations++;
    }

    // Update average execution time
    const totalTime = this.statistics.averageExecutionTime * (this.statistics.totalOperations - 1);
    this.statistics.averageExecutionTime = (totalTime + executionTime) / this.statistics.totalOperations;
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `db_op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start periodic metrics reporting
   */
  private startMetricsReporting(): void {
    setInterval(() => {
      this.emit('metrics:update', {
        ...this.statistics,
        queueLength: this.queue.length,
        processing: this.processing,
        currentOperation: this.currentOperation?.id || null
      });
    }, 5000); // Report every 5 seconds
  }

  /**
   * Get current queue statistics
   */
  getStatistics() {
    return {
      ...this.statistics,
      queueLength: this.queue.length,
      processing: this.processing,
      currentOperation: this.currentOperation?.id || null
    };
  }

  /**
   * Get current queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Check if queue is processing
   */
  isProcessing(): boolean {
    return this.processing;
  }

  /**
   * Clear all pending operations (emergency use only)
   */
  clearQueue(): void {
    console.warn('Database queue cleared - this may cause data loss!');
    
    // Reject all pending operations
    this.queue.forEach(op => {
      op.reject(new Error('Database queue was cleared'));
    });
    
    this.queue = [];
    this.statistics.queueLength = 0;
    
    this.emit('queue:cleared');
  }

  /**
   * Gracefully shutdown the queue
   */
  async shutdown(): Promise<void> {
    console.log('Database queue shutdown initiated...');
    
    // Wait for current operations to complete
    if (this.processing) {
      await new Promise<void>((resolve) => {
        const checkProcessing = () => {
          if (!this.processing) {
            resolve();
          } else {
            setTimeout(checkProcessing, 100);
          }
        };
        checkProcessing();
      });
    }

    // Clear any remaining operations
    this.clearQueue();
    
    console.log('Database queue shutdown completed');
    this.emit('queue:shutdown');
  }
}

// Singleton instance for the application
export const databaseQueue = new DatabaseQueue();

// Set up error handling
databaseQueue.on('operation:failed', ({ id, error }) => {
  console.error(`Database operation ${id} failed:`, error);
});

databaseQueue.on('operation:exhausted', ({ id, error }) => {
  console.error(`Database operation ${id} exhausted all retries:`, error);
});

databaseQueue.on('metrics:update', (metrics) => {
  if (metrics.queueLength > 10) {
    console.warn('Database queue length is high:', metrics.queueLength);
  }
  
  if (metrics.failedOperations > 0) {
    const errorRate = (metrics.failedOperations / metrics.totalOperations) * 100;
    if (errorRate > 5) { // More than 5% error rate
      console.warn(`Database error rate is high: ${errorRate.toFixed(2)}%`);
    }
  }
});