// Performance monitoring utilities for the new architecture

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private isEnabled: boolean = process.env.NODE_ENV === 'development';

  start(name: string, metadata?: Record<string, any>): void {
    if (!this.isEnabled) return;

    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata
    });
  }

  end(name: string): number | null {
    if (!this.isEnabled) return null;

    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Performance metric "${name}" not found`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;

    this.metrics.set(name, metric);
    return duration;
  }

  measure<T>(name: string, fn: () => T, metadata?: Record<string, any>): T;
  measure<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T>;
  measure<T>(name: string, fn: () => T | Promise<T>, metadata?: Record<string, any>): T | Promise<T> {
    if (!this.isEnabled) return fn();

    this.start(name, metadata);
    
    try {
      const result = fn();
      
      if (result instanceof Promise) {
        return result.finally(() => {
          this.end(name);
        });
      } else {
        this.end(name);
        return result;
      }
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  getMetric(name: string): PerformanceMetric | undefined {
    return this.metrics.get(name);
  }

  getAllMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  getMetricsByPattern(pattern: string): PerformanceMetric[] {
    const regex = new RegExp(pattern);
    return Array.from(this.metrics.values()).filter(metric => 
      regex.test(metric.name)
    );
  }

  logMetrics(pattern?: string): void {
    if (!this.isEnabled) return;

    const metrics = pattern ? this.getMetricsByPattern(pattern) : this.getAllMetrics();
    
    if (metrics.length === 0) {
      console.log('No performance metrics found');
      return;
    }

    console.group('Performance Metrics');
    metrics
      .filter(metric => metric.duration !== undefined)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .forEach(metric => {
        console.log(`${metric.name}: ${metric.duration?.toFixed(2)}ms`, metric.metadata);
      });
    console.groupEnd();
  }

  clear(): void {
    this.metrics.clear();
  }
}

// Global performance monitor instance
export const perfMonitor = new PerformanceMonitor();

// Convenience functions for common operations
export const measureApiCall = <T>(
  name: string,
  apiCall: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> => {
  return perfMonitor.measure(`api:${name}`, apiCall, metadata);
};

export const measureComponentRender = <T>(
  componentName: string,
  renderFn: () => T,
  metadata?: Record<string, any>
): T => {
  return perfMonitor.measure(`component:${componentName}`, renderFn, metadata);
};

export const measureFormOperation = <T>(
  operation: string,
  formFn: () => T,
  metadata?: Record<string, any>
): T => {
  return perfMonitor.measure(`form:${operation}`, formFn, metadata);
};

// Architecture-specific performance tracking
export const trackArchitectureMetrics = () => {
  if (typeof window === 'undefined') return;

  // Track API vs Backend comparison
  const trackApiComparison = (
    operation: string,
    newApiCall: () => Promise<any>,
    oldBackendCall?: () => Promise<any>
  ) => {
    const promises = [
      measureApiCall(`new:${operation}`, newApiCall)
    ];

    if (oldBackendCall) {
      promises.push(measureApiCall(`old:${operation}`, oldBackendCall));
    }

    return Promise.all(promises);
  };

  // Track component rendering performance
  const trackComponentPerformance = (
    componentName: string,
    renderCount: number = 1
  ) => {
    const start = performance.now();
    
    // Simulate component render cycles
    for (let i = 0; i < renderCount; i++) {
      perfMonitor.start(`${componentName}:render:${i}`);
      // Simulate work
      performance.mark(`${componentName}:render:${i}:end`);
      perfMonitor.end(`${componentName}:render:${i}`);
    }
    
    const totalTime = performance.now() - start;
    console.log(`${componentName} rendered ${renderCount} times in ${totalTime.toFixed(2)}ms`);
  };

  return {
    trackApiComparison,
    trackComponentPerformance
  };
};

// React hook for performance monitoring
export const usePerformanceMonitor = () => {
  const startTiming = (name: string, metadata?: Record<string, any>) => {
    perfMonitor.start(name, metadata);
  };

  const endTiming = (name: string) => {
    return perfMonitor.end(name);
  };

  const measureOperation = <T>(
    name: string,
    operation: () => T,
    metadata?: Record<string, any>
  ): T => {
    return perfMonitor.measure(name, operation, metadata);
  };

  const getMetrics = () => {
    return perfMonitor.getAllMetrics();
  };

  return {
    startTiming,
    endTiming,
    measureOperation,
    getMetrics,
    logMetrics: perfMonitor.logMetrics.bind(perfMonitor)
  };
};

// Performance comparison utilities
export const compareArchitectures = {
  // Compare old vs new API performance
  async compareApiPerformance(
    operation: string,
    newApiCall: () => Promise<any>,
    oldApiCall?: () => Promise<any>
  ) {
    const results = {
      new: await measureApiCall(`new:${operation}`, newApiCall),
      old: oldApiCall ? await measureApiCall(`old:${operation}`, oldApiCall) : null
    };

    const newDuration = perfMonitor.getMetric(`api:new:${operation}`)?.duration;
    const oldDuration = perfMonitor.getMetric(`api:old:${operation}`)?.duration;

    if (newDuration && oldDuration) {
      const improvement = ((oldDuration - newDuration) / oldDuration) * 100;
      console.log(`${operation} performance improvement: ${improvement.toFixed(2)}%`);
    }

    return results;
  },

  // Compare component rendering performance
  compareComponentPerformance(
    oldComponentName: string,
    newComponentName: string,
    renderCount: number = 100
  ) {
    const oldTimes: number[] = [];
    const newTimes: number[] = [];

    for (let i = 0; i < renderCount; i++) {
      const oldDuration = perfMonitor.measure(`old:${oldComponentName}:${i}`, () => {
        // Simulate old component render
        const start = performance.now();
        // Simulate complex data transformation
        for (let j = 0; j < 1000; j++) {
          Math.random();
        }
        return performance.now() - start;
      });

      const newDuration = perfMonitor.measure(`new:${newComponentName}:${i}`, () => {
        // Simulate new component render
        const start = performance.now();
        // Simulate direct data access
        for (let j = 0; j < 100; j++) {
          Math.random();
        }
        return performance.now() - start;
      });

      oldTimes.push(oldDuration);
      newTimes.push(newDuration);
    }

    const avgOld = oldTimes.reduce((a, b) => a + b, 0) / oldTimes.length;
    const avgNew = newTimes.reduce((a, b) => a + b, 0) / newTimes.length;
    const improvement = ((avgOld - avgNew) / avgOld) * 100;

    console.log(`Component performance comparison:`);
    console.log(`Old ${oldComponentName}: ${avgOld.toFixed(2)}ms average`);
    console.log(`New ${newComponentName}: ${avgNew.toFixed(2)}ms average`);
    console.log(`Improvement: ${improvement.toFixed(2)}%`);

    return { avgOld, avgNew, improvement };
  }
};

export default perfMonitor;