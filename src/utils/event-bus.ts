import { WikidataEntity } from '../types/wikidata';
import { logger } from '@/utils/logger';

/**
 * Universal Event Bus System for type-safe inter-pane communication
 */

export interface PaneEvents {
  // Category management
  'category:add': { name: string; type: string; source: string; priority?: number };
  'category:remove': { name: string; source: string };
  'category:clear': { source: string };
  'category:generate': { source: string; data: Record<string, any> };

  // Entity management
  'entity:select': { entity: WikidataEntity; role: string; source: string };
  'entity:remove': { entityId: string; role: string; source: string };
  'entity:update': { entity: WikidataEntity; changes: Record<string, any>; source: string };
  'entity:create': { entity: WikidataEntity; source: string };

  // Semantic data types - panes post what they have, others listen for what they need
  'persons:updated': { persons: WikidataEntity[]; source: string };
  'organizations:updated': { organizations: WikidataEntity[]; source: string };
  'events:updated': { events: WikidataEntity[]; source: string };
  'locations:updated': { locations: WikidataEntity[]; source: string };

  // Validation events
  'validation:update': { pane: string; valid: boolean; errors: string[] };
  'validation:request': { pane: string; source: string };
  'validation:reset': { pane: string; source: string };

  // Data change events
  'data:change': { pane: string; key: string; value: any; source: string };
  'data:sync': { pane: string; data: Record<string, any>; source: string };
  'data:reset': { pane: string; source: string };

  // UI events
  'ui:focus': { pane: string; field?: string; source: string };
  'ui:navigate': { pane: string; source: string };
  'ui:error': { pane: string; error: string; source: string };
  'ui:success': { pane: string; message: string; source: string };

  // Workflow events
  'workflow:start': { workflowId: string; config: any };
  'workflow:complete': { workflowId: string; data: Record<string, any> };
  'workflow:error': { workflowId: string; error: string };
  'workflow:cancel': { workflowId: string; reason: string };

  // Image events
  'image:add': { file: File; metadata: Record<string, any>; source: string };
  'image:remove': { fileId: string; source: string };
  'image:update': { fileId: string; metadata: Record<string, any>; source: string };

  // Template events
  'template:generate': { type: string; data: Record<string, any>; source: string };
  'template:update': { templateId: string; content: string; source: string };
  'template:remove': { templateId: string; source: string };

  // Publish events
  'publish:prepare': { data: Record<string, any>; source: string };
  'publish:start': { actions: any[]; source: string };
  'publish:progress': { progress: number; current: string; source: string };
  'publish:complete': { results: any[]; source: string };
  'publish:error': { error: string; action?: string; source: string };
}

export type EventName = keyof PaneEvents;
export type EventPayload<T extends EventName> = PaneEvents[T];
export type EventHandler<T extends EventName> = (payload: EventPayload<T>) => void | Promise<void>;

export interface EventSubscription {
  event: EventName;
  handler: EventHandler<any>;
  once: boolean;
  source?: string; // Optional source filter
}

export interface EventMiddleware {
  name: string;
  before?: (event: EventName, payload: any) => boolean | Promise<boolean>; // Return false to cancel
  after?: (event: EventName, payload: any, result: any) => void | Promise<void>;
  error?: (event: EventName, payload: any, error: Error) => void | Promise<void>;
}

/**
 * Universal Event Bus implementation
 */
export class UniversalEventBus {
  private subscriptions: Map<EventName, EventSubscription[]> = new Map();
  private middleware: EventMiddleware[] = [];
  private eventHistory: Array<{ event: EventName; payload: any; timestamp: Date }> = [];
  private maxHistorySize = 1000;
  private isLogging = false;

  /**
   * Subscribe to an event
   */
  subscribe<T extends EventName>(
    event: T,
    handler: EventHandler<T>,
    options: { once?: boolean; source?: string } = {}
  ): () => void {
    const subscription: EventSubscription = {
      event,
      handler,
      once: options.once || false,
      source: options.source
    };

    if (!this.subscriptions.has(event)) {
      this.subscriptions.set(event, []);
    }
    
    this.subscriptions.get(event)!.push(subscription);

    if (this.isLogging) {
      logger.debug('event-bus', `Subscribed to event: ${event}${options.source ? ` (source: ${options.source})` : ''}`);
    }

    // Return unsubscribe function
    return () => {
      const subs = this.subscriptions.get(event);
      if (subs) {
        const index = subs.indexOf(subscription);
        if (index !== -1) {
          subs.splice(index, 1);
          if (this.isLogging) {
            logger.debug('event-bus', `Unsubscribed from event: ${event}`);
          }
        }
      }
    };
  }

  /**
   * Subscribe to an event once
   */
  once<T extends EventName>(
    event: T,
    handler: EventHandler<T>,
    options: { source?: string } = {}
  ): () => void {
    return this.subscribe(event, handler, { ...options, once: true });
  }

  /**
   * Emit an event
   */
  async emit<T extends EventName>(event: T, payload: EventPayload<T>): Promise<void> {
    // Add to history
    this.addToHistory(event, payload);

    if (this.isLogging) {
      logger.debug('event-bus', `Emitting event: ${event}`, payload);
    }

    // Run before middleware
    for (const middleware of this.middleware) {
      if (middleware.before) {
        try {
          const shouldContinue = await middleware.before(event, payload);
          if (shouldContinue === false) {
            if (this.isLogging) {
              logger.debug('event-bus', `Event cancelled by middleware: ${middleware.name}`);
            }
            return;
          }
        } catch (error) {
          logger.error('event-bus', `Event middleware error (${middleware.name})`, error);
          if (middleware.error) {
            await middleware.error(event, payload, error as Error);
          }
        }
      }
    }

    // Get subscriptions for this event
    const subs = this.subscriptions.get(event) || [];
    const results: any[] = [];

    // Execute handlers
    for (const subscription of [...subs]) { // Copy array to avoid modification during iteration
      try {
        // Check source filter
        if (subscription.source && (payload as any).source !== subscription.source) {
          continue;
        }

        const result = await subscription.handler(payload);
        results.push(result);

        // Remove once subscriptions
        if (subscription.once) {
          const index = subs.indexOf(subscription);
          if (index !== -1) {
            subs.splice(index, 1);
          }
        }
      } catch (error) {
        logger.error('event-bus', `Event handler error for ${event}`, error);
        
        // Run error middleware
        for (const middleware of this.middleware) {
          if (middleware.error) {
            try {
              await middleware.error(event, payload, error as Error);
            } catch (middlewareError) {
              logger.error('event-bus', 'Middleware error handler failed', middlewareError);
            }
          }
        }
      }
    }

    // Run after middleware
    for (const middleware of this.middleware) {
      if (middleware.after) {
        try {
          await middleware.after(event, payload, results);
        } catch (error) {
          logger.error('event-bus', `Event middleware after error (${middleware.name})`, error);
        }
      }
    }
  }

  /**
   * Add middleware
   */
  addMiddleware(middleware: EventMiddleware): void {
    this.middleware.push(middleware);
    if (this.isLogging) {
      logger.debug('event-bus', `Added middleware: ${middleware.name}`);
    }
  }

  /**
   * Remove middleware
   */
  removeMiddleware(name: string): void {
    const index = this.middleware.findIndex(m => m.name === name);
    if (index !== -1) {
      this.middleware.splice(index, 1);
      if (this.isLogging) {
        logger.debug('event-bus', `Removed middleware: ${name}`);
      }
    }
  }

  /**
   * Clear all subscriptions
   */
  clear(): void {
    this.subscriptions.clear();
    if (this.isLogging) {
      logger.debug('event-bus', 'Cleared all subscriptions');
    }
  }

  /**
   * Get current subscriptions
   */
  getSubscriptions(): Map<EventName, EventSubscription[]> {
    return new Map(this.subscriptions);
  }

  /**
   * Get event history
   */
  getHistory(limit?: number): Array<{ event: EventName; payload: any; timestamp: Date }> {
    return limit ? this.eventHistory.slice(-limit) : [...this.eventHistory];
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Enable/disable logging
   */
  setLogging(enabled: boolean): void {
    this.isLogging = enabled;
  }

  /**
   * Wait for a specific event
   */
  waitFor<T extends EventName>(
    event: T,
    options: { timeout?: number; source?: string } = {}
  ): Promise<EventPayload<T>> {
    return new Promise((resolve, reject) => {
      const { timeout = 10000, source } = options;

      const unsubscribe = this.once(event, (payload) => {
        resolve(payload);
      }, { source });

      // Setup timeout
      const timeoutId = setTimeout(() => {
        unsubscribe();
        reject(new Error(`Timeout waiting for event: ${event}`));
      }, timeout);

      // Clear timeout when resolved
      const originalResolve = resolve;
      resolve = (payload) => {
        clearTimeout(timeoutId);
        originalResolve(payload);
      };
    });
  }

  /**
   * Create a scoped event bus for a specific pane
   */
  createScope(paneId: string): ScopedEventBus {
    return new ScopedEventBus(this, paneId);
  }

  private addToHistory(event: EventName, payload: any): void {
    this.eventHistory.push({
      event,
      payload: JSON.parse(JSON.stringify(payload)), // Deep copy
      timestamp: new Date()
    });

    // Trim history if too large
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }
}

/**
 * Scoped event bus for individual panes
 */
export class ScopedEventBus {
  constructor(private globalBus: UniversalEventBus, private paneId: string) {}

  /**
   * Subscribe to events with pane scope
   */
  subscribe<T extends EventName>(
    event: T,
    handler: EventHandler<T>,
    options: { once?: boolean; source?: string } = {}
  ): () => void {
    return this.globalBus.subscribe(event, handler, options);
  }

  /**
   * Emit events with automatic source tagging
   */
  async emit<T extends EventName>(event: T, payload: EventPayload<T>): Promise<void> {
    const taggedPayload = {
      ...payload,
      source: this.paneId
    } as EventPayload<T>;

    await this.globalBus.emit(event, taggedPayload);
  }

  /**
   * Post data to other panes (convenience method)
   */
  async post<T extends EventName>(event: T, data: Omit<EventPayload<T>, 'source'>): Promise<void> {
    await this.emit(event, { ...data, source: this.paneId } as EventPayload<T>);
  }

  /**
   * Request data from other panes
   */
  async request<T extends EventName>(event: T, timeout?: number): Promise<EventPayload<T>> {
    return this.globalBus.waitFor(event, { timeout });
  }
}

// Global event bus instance
export const globalEventBus = new UniversalEventBus();

// Common middleware
export const loggingMiddleware: EventMiddleware = {
  name: 'logging',
  before: (event, payload) => {
    logger.debug('event-bus', `Event: ${event}`, payload);
    return true;
  },
  error: (event, payload, error) => {
    logger.error('event-bus', `Event error: ${event}`, { payload, error });
  }
};

export const validationMiddleware: EventMiddleware = {
  name: 'validation',
  before: (event, payload) => {
    // Basic payload validation
    if (!payload || typeof payload !== 'object') {
      logger.error('event-bus', `Invalid payload for event: ${event}`);
      return false;
    }
    
    // Check required source field for most events
    if (!payload.source && !['workflow:start', 'workflow:complete'].includes(event)) {
      logger.warn('event-bus', `Event ${event} missing source field`);
    }
    
    return true;
  }
};

// Development mode helpers
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).eventBus = globalEventBus;
  globalEventBus.setLogging(true);
  globalEventBus.addMiddleware(validationMiddleware);
}

export default globalEventBus;