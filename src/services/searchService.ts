/**
 * Search Service - Handles fuzzy matching and result ranking
 */

import Fuse, { FuseResult } from 'fuse.js';
import { invoke } from '@tauri-apps/api/core';
import { getFileIcon } from '@/utils/iconMaps';
import type { SearchResult, SearchResultType, ScoringConfig, SearchOptions, SearchResponse } from '@/types/search';

// Default scoring configuration
const DEFAULT_CONFIG: ScoringConfig = {
  fuzzyWeight: 0.5,
  frequencyWeight: 0.3,
  typeWeight: 0.2,
};

// Fuse.js options for fuzzy matching
const FUSE_OPTIONS = {
  includeScore: true,
  threshold: 0.6,           // Higher threshold = more permissive matching (chr -> Chrome)
  ignoreLocation: true,
  keys: ['title', 'subtitle'],
  // Add distance and minMatchCharLength for better short query matching
  distance: 100,
  minMatchCharLength: 1,
  // Enable case-insensitive matching
  caseSensitive: false,
  // Allow for more flexible matching
  shouldSort: true,
  includeMatches: false,
};

export class SearchService {
  private config: ScoringConfig;
  private fuseInstances: Map<string, Fuse<any>> = new Map();

  constructor(config: ScoringConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  /**
   * Calculate relevance score for a search result
   */
  calculateScore(
    fuzzyScore: number,
    frequency: number,
    type: SearchResultType
  ): number {
    const { fuzzyWeight, frequencyWeight, typeWeight } = this.config;

    // Normalize fuzzy score (Fuse returns 0-1 where 0 is perfect match)
    const normalizedFuzzyScore = 1 - fuzzyScore;

    // Frequency boost (0-100+ launches, normalize to 0-1)
    const frequencyBoost = Math.min(frequency / 100, 1.0);

    // Type priority boost
    const TYPE_PRIORITY: Record<SearchResultType, number> = {
      app: 1.0,
      clipboard: 0.9,
      bookmark: 0.8,
      history: 0.7,
      file: 0.6,
      plugin: 0.5,
      action: 0.55,
      url: 0.5,
      color: 0.95,
    };
    const typeBoost = TYPE_PRIORITY[type];

    return (
      normalizedFuzzyScore * fuzzyWeight +
      frequencyBoost * frequencyWeight +
      typeBoost * typeWeight
    );
  }

  /**
   * Perform fuzzy search on a list of items
   */
  fuzzySearch<T extends SearchResult>(
    items: T[],
    query: string
  ): FuseResult<T>[] {
    if (!query.trim()) {
      return items.map((item, index) => ({
        item,
        score: 0,
        refIndex: index,
      }));
    }

    // Create or get cached Fuse instance
    const cacheKey = `${items.length}-${query.slice(0, 10)}`;
    let fuse = this.fuseInstances.get(cacheKey);

    if (!fuse) {
      fuse = new Fuse(items, FUSE_OPTIONS);
      // Limit cache size
      if (this.fuseInstances.size > 50) {
        const firstKey = this.fuseInstances.keys().next().value;
        if (firstKey) {
          this.fuseInstances.delete(firstKey);
        }
      }
      this.fuseInstances.set(cacheKey, fuse);
    }

    return fuse.search(query);
  }

  /**
   * Search and rank results from multiple sources
   */
  search(
    allItems: SearchResult[],
    query: string,
    options?: SearchOptions
  ): SearchResponse {
    const startTime = performance.now();

    let items = allItems;

    // Filter by sources if specified
    if (options?.sources && options.sources.length > 0) {
      items = items.filter(item => options.sources!.includes(item.type));
    }

    // Perform fuzzy search
    let fuseResults = this.fuzzySearch(items, query);

    // If fuzzy search returns no results OR all results have poor scores, try abbreviation matching
    // This handles cases like "chr" -> "Chrome" where Fuse may return weak or no matches
    const hasPoorMatches = fuseResults.length > 0 && fuseResults.every(r => (r.score || 0) > 0.6);

    if ((fuseResults.length === 0 || hasPoorMatches) && query.length >= 2 && query.length <= 10) {
      const queryLower = query.toLowerCase();
      const abbrResults: FuseResult<SearchResult>[] = [];

      for (const item of items) {
        const title = item.title || '';
        const subtitle = item.subtitle || '';
        const titleLower = title.toLowerCase();

        // Match 1: Exact substring match (chr -> Chrome)
        if (titleLower.includes(queryLower)) {
          // Calculate score based on match position
          const matchPos = titleLower.indexOf(queryLower);
          const positionScore = matchPos === 0 ? 0.05 : 0.1; // Better score for match at start
          abbrResults.push({
            item,
            score: positionScore, // Very good score for substring match
            refIndex: 0,
          });
          continue;
        }

        // Match 2: Initials of words (vsc -> Visual Studio Code)
        const titleWords = title.split(/\s+/).filter(w => w.length > 0);
        const initials = titleWords.map(w => w[0]?.toLowerCase() || '').join('');

        if (initials.includes(queryLower) || queryLower === initials) {
          abbrResults.push({
            item,
            score: 0.15, // Good score for abbreviation match
            refIndex: 0,
          });
          continue;
        }

        // Match 3: Sequential character match (chr -> Chrome by matching c-h-r in order)
        let charIndex = 0;
        for (const char of titleLower) {
          if (char === queryLower[charIndex]) {
            charIndex++;
            if (charIndex >= queryLower.length) {
              abbrResults.push({
                item,
                score: 0.2, // Acceptable score for sequential match
                refIndex: 0,
              });
              break;
            }
          }
        }
      }

      if (abbrResults.length > 0) {
        // Sort by score and use the best abbreviation matches
        abbrResults.sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
        fuseResults = abbrResults;
      }
    }

    // Apply ranking and transform to SearchResult
    const results: SearchResult[] = fuseResults
      .slice(0, options?.limit || 100)
      .map((result) => {
        const item = result.item;
        const baseScore = this.calculateScore(
          result.score || 0,
          (item as any).frequency || 0,
          item.type
        );

        return {
          ...item,
          score: baseScore,
        };
      })
      .sort((a, b) => b.score - a.score); // Sort by relevance (highest first)

    const queryTime = performance.now() - startTime;

    return {
      results,
      total: results.length,
      queryTime,
    };
  }

  /**
   * Create a search result from app data
   */
  createAppResult(
    id: string,
    name: string,
    executablePath: string,
    icon?: string,
    frequency = 0
  ): SearchResult {
    return {
      id,
      title: name,
      subtitle: executablePath,
      icon,
      type: 'app',
      score: 0,
      action: async () => {
        await invoke('launch_app', { path: executablePath });
      },
    };
  }

  /**
   * Create a search result from file data (T155)
   */
  createFileResult(
    id: string,
    filename: string,
    path: string,
    extension?: string,
    size = 0
  ): SearchResult {
    return {
      id,
      title: filename,
      subtitle: path,
      icon: getFileIcon(extension),
      type: 'file',
      score: 0,
      action: async () => {
        // Open file with default application
        await invoke('open_url', { url: `file://${path}` });
      },
    };
  }

  /**
   * Create a search result from browser bookmark/history (T156)
   */
  createBrowserResult(
    id: string,
    title: string,
    url: string,
    browser: string,
    entryType: 'bookmark' | 'history',
    favicon?: string
  ): SearchResult {
    return {
      id,
      title,
      subtitle: url,
      icon: favicon,
      type: entryType === 'bookmark' ? 'bookmark' : 'history',
      score: 0,
      action: async () => {
        await invoke('open_url', { url });
      },
    };
  }
}

// Singleton instance
let searchServiceInstance: SearchService | null = null;

export function getSearchService(): SearchService {
  if (!searchServiceInstance) {
    searchServiceInstance = new SearchService();
  }
  return searchServiceInstance;
}
