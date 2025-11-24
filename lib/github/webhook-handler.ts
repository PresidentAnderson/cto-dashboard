/**
 * GitHub Webhook Handler
 *
 * Processes GitHub webhook events with signature verification,
 * event routing, and incremental updates.
 */

import crypto from 'crypto';
import { prisma } from '../prisma';
import { getGitHubClient } from './client';
import {
  normalizeRepository,
  normalizeIssue,
  normalizePRActivity,
  normalizeIssueActivity,
  normalizeCommitActivity,
} from './normalizer';
import type {
  GitHubWebhookPayload,
  IssueWebhookPayload,
  PullRequestWebhookPayload,
  PushWebhookPayload,
  isIssueWebhook,
  isPullRequestWebhook,
  isPushWebhook,
} from './types';

// ============================================================================
// Webhook Signature Verification
// ============================================================================

/**
 * Verify GitHub webhook signature
 *
 * GitHub signs webhook payloads with HMAC-SHA256 using your webhook secret.
 * The signature is sent in the X-Hub-Signature-256 header.
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret) {
    console.error('Missing signature or secret');
    return false;
  }

  try {
    // GitHub sends signature as "sha256=<hash>"
    const sigHashAlg = 'sha256';
    const parts = signature.split('=');

    if (parts.length !== 2 || parts[0] !== sigHashAlg) {
      console.error('Invalid signature format');
      return false;
    }

    const receivedHash = parts[1];

    // Calculate expected signature
    const hmac = crypto.createHmac(sigHashAlg, secret);
    const payloadBuffer = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
    hmac.update(payloadBuffer);
    const expectedHash = hmac.digest('hex');

    // Use timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(receivedHash, 'hex'),
      Buffer.from(expectedHash, 'hex')
    );
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

/**
 * Verify webhook signature from Express request
 */
export function verifyWebhookRequest(
  body: string | Buffer,
  headers: Record<string, string | string[] | undefined>
): boolean {
  const signature = headers['x-hub-signature-256'];
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!secret) {
    console.error('GITHUB_WEBHOOK_SECRET not configured');
    return false;
  }

  if (!signature || Array.isArray(signature)) {
    console.error('Missing or invalid signature header');
    return false;
  }

  return verifyWebhookSignature(body, signature, secret);
}

// ============================================================================
// Webhook Event Types
// ============================================================================

export type WebhookEventType =
  | 'ping'
  | 'push'
  | 'issues'
  | 'pull_request'
  | 'repository'
  | 'star'
  | 'fork'
  | 'watch'
  | 'create'
  | 'delete'
  | 'release'
  | 'unknown';

/**
 * Get event type from headers
 */
export function getEventType(headers: Record<string, string | string[] | undefined>): WebhookEventType {
  const eventHeader = headers['x-github-event'];

  if (!eventHeader || Array.isArray(eventHeader)) {
    return 'unknown';
  }

  return eventHeader as WebhookEventType;
}

// ============================================================================
// Webhook Handler Class
// ============================================================================

export class WebhookHandler {
  private handlers: Map<WebhookEventType, (payload: any) => Promise<void>> = new Map();

  constructor() {
    // Register default handlers
    this.registerHandler('ping', this.handlePing.bind(this));
    this.registerHandler('push', this.handlePush.bind(this));
    this.registerHandler('issues', this.handleIssue.bind(this));
    this.registerHandler('pull_request', this.handlePullRequest.bind(this));
    this.registerHandler('repository', this.handleRepository.bind(this));
  }

  /**
   * Register a custom event handler
   */
  public registerHandler(eventType: WebhookEventType, handler: (payload: any) => Promise<void>): void {
    this.handlers.set(eventType, handler);
  }

  /**
   * Process webhook event
   */
  async processWebhook(
    eventType: WebhookEventType,
    payload: GitHubWebhookPayload
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`Processing webhook event: ${eventType}`);

      const handler = this.handlers.get(eventType);

      if (!handler) {
        console.warn(`No handler registered for event type: ${eventType}`);
        return {
          success: true,
          message: `Event type ${eventType} received but not handled`,
        };
      }

      await handler(payload);

      return {
        success: true,
        message: `Event ${eventType} processed successfully`,
      };
    } catch (error) {
      console.error(`Error processing webhook event ${eventType}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ==========================================================================
  // Event Handlers
  // ==========================================================================

  /**
   * Handle ping event (webhook verification)
   */
  private async handlePing(payload: any): Promise<void> {
    console.log('Received ping event from GitHub');
    console.log(`Hook ID: ${payload.hook_id}`);
    console.log(`Zen: ${payload.zen}`);
  }

  /**
   * Handle push event (new commits)
   */
  private async handlePush(payload: PushWebhookPayload): Promise<void> {
    console.log(`Push event: ${payload.commits?.length || 0} commits to ${payload.ref}`);

    if (!payload.repository || !payload.commits || payload.commits.length === 0) {
      console.log('No commits to process');
      return;
    }

    // Find or create project
    const project = await this.findOrCreateProject(payload.repository);

    if (!project) {
      console.error('Failed to find or create project');
      return;
    }

    // Update last commit time
    await prisma.project.update({
      where: { id: project.id },
      data: {
        lastCommit: new Date(payload.head_commit.commit.author.date),
        updatedAt: new Date(),
      },
    });

    console.log(`Updated last commit time for project ${project.name}`);

    // TODO: Store commit activities if needed
    // const activities = payload.commits.map(commit =>
    //   normalizeCommitActivity(commit, project.id, payload.repository.name)
    // );
  }

  /**
   * Handle issue event (opened, closed, edited, etc.)
   */
  private async handleIssue(payload: IssueWebhookPayload): Promise<void> {
    console.log(`Issue event: ${payload.action} - ${payload.issue.title}`);

    if (!payload.repository) {
      console.error('No repository in payload');
      return;
    }

    // Find or create project
    const project = await this.findOrCreateProject(payload.repository);

    if (!project) {
      console.error('Failed to find or create project');
      return;
    }

    // Normalize and save issue
    const normalizedBug = normalizeIssue(payload.issue, project.id);

    const bug = await prisma.bug.upsert({
      where: { bugNumber: normalizedBug.bugNumber },
      create: normalizedBug,
      update: normalizedBug,
    });

    console.log(`Bug ${bug.bugNumber} ${payload.action}: ${bug.title}`);

    // Record history if issue was closed
    if (payload.action === 'closed' && payload.issue.closed_at) {
      await prisma.bugHistory.create({
        data: {
          bugId: bug.id,
          fieldChanged: 'status',
          oldValue: 'open',
          newValue: 'closed',
          changedAt: new Date(payload.issue.closed_at),
        },
      });
    }
  }

  /**
   * Handle pull request event
   */
  private async handlePullRequest(payload: PullRequestWebhookPayload): Promise<void> {
    console.log(`PR event: ${payload.action} - ${payload.pull_request.title}`);

    if (!payload.repository) {
      console.error('No repository in payload');
      return;
    }

    // Find or create project
    const project = await this.findOrCreateProject(payload.repository);

    if (!project) {
      console.error('Failed to find or create project');
      return;
    }

    // Handle different PR actions
    switch (payload.action) {
      case 'opened':
        console.log(`PR #${payload.pull_request.number} opened by ${payload.pull_request.user.login}`);
        // TODO: Store PR activity
        break;

      case 'closed':
        if (payload.pull_request.merged_at) {
          console.log(`PR #${payload.pull_request.number} merged`);
          // Update project last commit time
          await prisma.project.update({
            where: { id: project.id },
            data: {
              lastCommit: new Date(payload.pull_request.merged_at),
              updatedAt: new Date(),
            },
          });
        } else {
          console.log(`PR #${payload.pull_request.number} closed without merge`);
        }
        break;

      case 'ready_for_review':
        console.log(`PR #${payload.pull_request.number} ready for review`);
        break;

      default:
        console.log(`PR action: ${payload.action}`);
    }
  }

  /**
   * Handle repository event (created, archived, etc.)
   */
  private async handleRepository(payload: any): Promise<void> {
    console.log(`Repository event: ${payload.action}`);

    if (!payload.repository) {
      console.error('No repository in payload');
      return;
    }

    // Update or create repository
    const normalized = normalizeRepository(payload.repository);

    await prisma.project.upsert({
      where: { githubUrl: normalized.githubUrl },
      create: normalized,
      update: normalized,
    });

    console.log(`Repository ${payload.action}: ${payload.repository.name}`);
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Find existing project or create new one from repository data
   */
  private async findOrCreateProject(repository: any) {
    try {
      // Try to find by GitHub URL
      let project = await prisma.project.findUnique({
        where: { githubUrl: repository.html_url },
      });

      if (!project) {
        // Create new project from repository data
        const normalized = normalizeRepository(repository);
        project = await prisma.project.create({
          data: normalized,
        });
        console.log(`Created new project: ${project.name}`);
      }

      return project;
    } catch (error) {
      console.error('Error finding/creating project:', error);
      return null;
    }
  }
}

// ============================================================================
// Express Middleware
// ============================================================================

/**
 * Express middleware for handling GitHub webhooks
 */
export function createWebhookMiddleware(handler?: WebhookHandler) {
  const webhookHandler = handler || new WebhookHandler();

  return async (req: any, res: any) => {
    try {
      // Verify signature
      const body = req.body;
      const bodyString = typeof body === 'string' ? body : JSON.stringify(body);

      if (!verifyWebhookRequest(bodyString, req.headers)) {
        console.error('Webhook signature verification failed');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // Get event type
      const eventType = getEventType(req.headers);

      if (eventType === 'unknown') {
        console.error('Unknown event type');
        return res.status(400).json({ error: 'Unknown event type' });
      }

      // Parse payload
      const payload = typeof body === 'string' ? JSON.parse(body) : body;

      // Process webhook
      const result = await webhookHandler.processWebhook(eventType, payload);

      if (result.success) {
        return res.status(200).json({ message: result.message });
      } else {
        return res.status(500).json({ error: result.message });
      }
    } catch (error) {
      console.error('Error in webhook middleware:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

// ============================================================================
// Singleton Instance
// ============================================================================

let handlerInstance: WebhookHandler | null = null;

/**
 * Get or create singleton webhook handler
 */
export function getWebhookHandler(): WebhookHandler {
  if (!handlerInstance) {
    handlerInstance = new WebhookHandler();
  }
  return handlerInstance;
}

/**
 * Reset singleton instance (useful for testing)
 */
export function resetWebhookHandler(): void {
  handlerInstance = null;
}
