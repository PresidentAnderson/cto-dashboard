/**
 * GitHub Sync Status Tracker
 *
 * Tracks sync progress, stores in database, and emits real-time updates via SSE.
 * Provides error reporting and sync history.
 */

import { EventEmitter } from 'events';
import { prisma } from '../prisma';
import type { SyncProgress, SyncStage, SyncError, SyncResult } from './types';
import { ImportSource } from '@prisma/client';

// ============================================================================
// Sync Event Types
// ============================================================================

export interface SyncEventData {
  id: string;
  syncType: 'full' | 'incremental' | 'webhook';
  status: 'running' | 'completed' | 'failed';
  progress: SyncProgress;
  result?: SyncResult;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Sync Status Tracker
// ============================================================================

export class SyncStatusTracker extends EventEmitter {
  private currentSync: SyncEventData | null = null;

  constructor() {
    super();
  }

  /**
   * Start tracking a new sync operation
   */
  async startSync(syncType: 'full' | 'incremental' | 'webhook', initialProgress: SyncProgress): Promise<string> {
    // Create sync event in database
    const syncEvent = await prisma.importLog.create({
      data: {
        source: ImportSource.github,
        recordsImported: 0,
        recordsFailed: 0,
        errors: [],
        metadata: {
          syncType,
          status: 'running',
          progress: initialProgress,
        },
      },
    });

    this.currentSync = {
      id: syncEvent.id,
      syncType,
      status: 'running',
      progress: initialProgress,
      createdAt: syncEvent.timestamp,
      updatedAt: syncEvent.timestamp,
    };

    // Emit start event
    this.emit('sync:start', this.currentSync);

    console.log(`Sync started: ${syncEvent.id} (${syncType})`);

    return syncEvent.id;
  }

  /**
   * Update sync progress
   */
  async updateProgress(progress: SyncProgress): Promise<void> {
    if (!this.currentSync) {
      console.warn('No active sync to update');
      return;
    }

    this.currentSync.progress = progress;
    this.currentSync.updatedAt = new Date();

    // Update database
    await prisma.importLog.update({
      where: { id: this.currentSync.id },
      data: {
        metadata: {
          ...(this.currentSync as any).metadata,
          progress,
        },
      },
    });

    // Emit progress event
    this.emit('sync:progress', this.currentSync);

    // Log progress
    const { processedRepos, totalRepos, stage, currentRepo } = progress;
    console.log(
      `Sync progress: [${processedRepos}/${totalRepos}] ${stage}${currentRepo ? ` - ${currentRepo}` : ''}`
    );
  }

  /**
   * Complete sync operation
   */
  async completeSync(result: SyncResult): Promise<void> {
    if (!this.currentSync) {
      console.warn('No active sync to complete');
      return;
    }

    this.currentSync.status = result.success ? 'completed' : 'failed';
    this.currentSync.result = result;
    this.currentSync.updatedAt = new Date();

    // Update database
    await prisma.importLog.update({
      where: { id: this.currentSync.id },
      data: {
        recordsImported: result.reposSynced + result.issuesSynced + result.prsSynced + result.commitsSynced,
        recordsFailed: result.errors.length,
        errors: result.errors.map(e => e.error),
        metadata: {
          ...(this.currentSync as any).metadata,
          status: this.currentSync.status,
          result,
        },
      },
    });

    // Emit complete event
    this.emit('sync:complete', this.currentSync);

    console.log(`Sync ${this.currentSync.status}: ${this.currentSync.id}`);
    console.log(`Results: ${result.reposSynced} repos, ${result.issuesSynced} issues, ${result.prsSynced} PRs, ${result.commitsSynced} commits`);

    // Clear current sync
    this.currentSync = null;
  }

  /**
   * Fail sync operation
   */
  async failSync(error: Error): Promise<void> {
    if (!this.currentSync) {
      console.warn('No active sync to fail');
      return;
    }

    this.currentSync.status = 'failed';
    this.currentSync.updatedAt = new Date();

    // Update database
    await prisma.importLog.update({
      where: { id: this.currentSync.id },
      data: {
        recordsFailed: 1,
        errors: [error.message],
        metadata: {
          ...(this.currentSync as any).metadata,
          status: 'failed',
          error: {
            message: error.message,
            stack: error.stack,
          },
        },
      },
    });

    // Emit error event
    this.emit('sync:error', { sync: this.currentSync, error });

    console.error(`Sync failed: ${this.currentSync.id}`, error);

    // Clear current sync
    this.currentSync = null;
  }

  /**
   * Get current sync status
   */
  getCurrentSync(): SyncEventData | null {
    return this.currentSync ? { ...this.currentSync } : null;
  }

  /**
   * Check if a sync is currently running
   */
  isSyncRunning(): boolean {
    return this.currentSync !== null;
  }

  /**
   * Get sync history from database
   */
  async getSyncHistory(limit: number = 20): Promise<SyncEventData[]> {
    const logs = await prisma.importLog.findMany({
      where: { source: ImportSource.github },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return logs.map(log => ({
      id: log.id,
      syncType: (log.metadata as any)?.syncType || 'full',
      status: (log.metadata as any)?.status || 'completed',
      progress: (log.metadata as any)?.progress || {
        totalRepos: 0,
        processedRepos: 0,
        currentRepo: null,
        stage: 'completed' as SyncStage,
        startTime: log.timestamp,
      },
      result: (log.metadata as any)?.result,
      createdAt: log.timestamp,
      updatedAt: log.timestamp,
    }));
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<{
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    lastSyncAt: Date | null;
    avgDuration: number | null;
    totalRecordsImported: number;
  }> {
    const logs = await prisma.importLog.findMany({
      where: { source: ImportSource.github },
    });

    const successfulSyncs = logs.filter(log => (log.metadata as any)?.status === 'completed' || log.recordsFailed === 0);
    const failedSyncs = logs.filter(log => (log.metadata as any)?.status === 'failed' || log.recordsFailed > 0);

    // Calculate average duration
    const durations = logs
      .filter(log => (log.metadata as any)?.result?.duration)
      .map(log => (log.metadata as any).result.duration);

    const avgDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : null;

    // Get last sync time
    const lastSync = logs.length > 0 ? logs[0].timestamp : null;

    // Total records imported
    const totalRecordsImported = logs.reduce((sum, log) => sum + log.recordsImported, 0);

    return {
      totalSyncs: logs.length,
      successfulSyncs: successfulSyncs.length,
      failedSyncs: failedSyncs.length,
      lastSyncAt: lastSync,
      avgDuration,
      totalRecordsImported,
    };
  }

  /**
   * Clear sync history (optional, for cleanup)
   */
  async clearSyncHistory(olderThan?: Date): Promise<number> {
    const where = olderThan
      ? {
          source: ImportSource.github,
          timestamp: { lt: olderThan },
        }
      : { source: ImportSource.github };

    const result = await prisma.importLog.deleteMany({ where });

    console.log(`Cleared ${result.count} sync history records`);

    return result.count;
  }
}

// ============================================================================
// Server-Sent Events (SSE) Support
// ============================================================================

export class SyncSSEManager {
  private tracker: SyncStatusTracker;
  private clients: Set<any> = new Set();

  constructor(tracker: SyncStatusTracker) {
    this.tracker = tracker;
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for sync events
   */
  private setupEventListeners(): void {
    this.tracker.on('sync:start', (sync) => {
      this.broadcast({ type: 'sync:start', data: sync });
    });

    this.tracker.on('sync:progress', (sync) => {
      this.broadcast({ type: 'sync:progress', data: sync });
    });

    this.tracker.on('sync:complete', (sync) => {
      this.broadcast({ type: 'sync:complete', data: sync });
    });

    this.tracker.on('sync:error', ({ sync, error }) => {
      this.broadcast({
        type: 'sync:error',
        data: {
          sync,
          error: {
            message: error.message,
            stack: error.stack,
          },
        },
      });
    });
  }

  /**
   * Add SSE client
   */
  addClient(client: any): void {
    this.clients.add(client);
    console.log(`SSE client connected. Total clients: ${this.clients.size}`);

    // Send current sync status to new client
    const currentSync = this.tracker.getCurrentSync();
    if (currentSync) {
      this.sendToClient(client, { type: 'sync:current', data: currentSync });
    }
  }

  /**
   * Remove SSE client
   */
  removeClient(client: any): void {
    this.clients.delete(client);
    console.log(`SSE client disconnected. Total clients: ${this.clients.size}`);
  }

  /**
   * Broadcast message to all clients
   */
  private broadcast(message: any): void {
    const data = JSON.stringify(message);

    this.clients.forEach(client => {
      this.sendToClient(client, message);
    });
  }

  /**
   * Send message to specific client
   */
  private sendToClient(client: any, message: any): void {
    try {
      const data = JSON.stringify(message);
      client.write(`data: ${data}\n\n`);
    } catch (error) {
      console.error('Error sending to SSE client:', error);
      this.removeClient(client);
    }
  }

  /**
   * Create Express SSE endpoint handler
   */
  createSSEHandler() {
    return (req: any, res: any) => {
      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

      // Add client
      this.addClient(res);

      // Remove client on disconnect
      req.on('close', () => {
        this.removeClient(res);
      });

      // Send keep-alive ping every 30 seconds
      const pingInterval = setInterval(() => {
        try {
          res.write(': ping\n\n');
        } catch (error) {
          clearInterval(pingInterval);
        }
      }, 30000);

      req.on('close', () => {
        clearInterval(pingInterval);
      });
    };
  }

  /**
   * Get connected client count
   */
  getClientCount(): number {
    return this.clients.size;
  }
}

// ============================================================================
// Singleton Instances
// ============================================================================

let trackerInstance: SyncStatusTracker | null = null;
let sseManagerInstance: SyncSSEManager | null = null;

/**
 * Get or create singleton sync status tracker
 */
export function getSyncStatusTracker(): SyncStatusTracker {
  if (!trackerInstance) {
    trackerInstance = new SyncStatusTracker();
  }
  return trackerInstance;
}

/**
 * Get or create singleton SSE manager
 */
export function getSyncSSEManager(): SyncSSEManager {
  if (!sseManagerInstance) {
    const tracker = getSyncStatusTracker();
    sseManagerInstance = new SyncSSEManager(tracker);
  }
  return sseManagerInstance;
}

/**
 * Reset singleton instances (useful for testing)
 */
export function resetSyncStatus(): void {
  trackerInstance = null;
  sseManagerInstance = null;
}
