import { Injectable } from '@angular/core';
import { from, Observable, of } from 'rxjs';
import {
  PeriodicElement,
  PeriodicTablePayload,
} from '../../../periodic/models/periodic.model';

@Injectable({ providedIn: 'root' })
export class PeriodicTableService {
  private readonly url =
    'https://raw.githubusercontent.com/Bowserinator/Periodic-Table-JSON/master/PeriodicTableJSON.json';
  private readonly storageKey = 'periodicTable.cache';
  private readonly ttl = 7 * 24 * 60 * 60 * 1000; // 7 days
  private memoryCache: PeriodicElement[] | null = null;

  getElements(force = false): Observable<PeriodicElement[]> {
    if (this.memoryCache && !force) {
      return of(this.memoryCache);
    }

    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw && !force) {
        const parsed = JSON.parse(raw) as {
          ts: number;
          data: PeriodicElement[];
        };
        if (Date.now() - parsed.ts < this.ttl) {
          this.memoryCache = parsed.data;
          return of(parsed.data);
        }
      }
    } catch (e) {
      // ignore and fetch
    }

    return from(this.fetchAndCache());
  }

  getElementBySymbol(sym: string): Observable<PeriodicElement | undefined> {
    const symbol = (sym || '').trim();
    return from(
      this.fetchAndCache().then((list) =>
        list.find((e) => e.symbol.toLowerCase() === symbol.toLowerCase()),
      ),
    );
  }

  private async fetchAndCache(): Promise<PeriodicElement[]> {
    const response = await fetch(this.url, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error('Failed to fetch periodic table');
    }

    const clone = response.clone();
    try {
      const cache = await caches.open('periodic-table');
      await cache.put(this.url, clone);
    } catch (e) {
      // ignore if Cache API not available
    }

    const payload = (await response.json()) as PeriodicTablePayload;
    const elements = payload.elements || [];
    try {
      localStorage.setItem(
        this.storageKey,
        JSON.stringify({ ts: Date.now(), data: elements }),
      );
    } catch (e) {}
    this.memoryCache = elements;
    return elements;
  }
}
