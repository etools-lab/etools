/**
 * Action Service - Quick Actions and Calculations (T037-T042)
 * Handles calculator, color conversions, and web search triggers
 */

import type { SearchResult } from '@/types/search';
import convert from 'color-convert';
import { invoke } from '@tauri-apps/api/core';

// Color format detection patterns (T037)
const COLOR_PATTERNS = {
  hex: /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
  rgb: /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([\d.]+)\s*)?\)$/,
  hsl: /^hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*(?:,\s*([\d.]+)\s*)?\)$/,
  named: /^(red|green|blue|yellow|orange|purple|pink|brown|black|white|gray|grey|cyan|magenta|lime|maroon|navy|olive|teal|aqua|fuchsia|silver|transparent)$/i,
};

// Calculator regex patterns
const CALC_PATTERNS = [
  /^[\d\s\+\-\*\/\(\)\.]+$/,  // Basic math expression
  /^0x[0-9a-fA-F]+$/,           // Hex number
];

// Web search trigger patterns
const SEARCH_TRIGGERS = [
  { prefix: 'g:', engine: 'google', url: 'https://www.google.com/search?q=' },
  { prefix: 'ddg:', engine: 'duckduckgo', url: 'https://duckduckgo.com/?q=' },
  { prefix: 'gh:', engine: 'github', url: 'https://github.com/search?q=' },
  { prefix: 'so:', engine: 'stackoverflow', url: 'https://stackoverflow.com/search?q=' },
];

export class ActionService {
  /**
   * Detect and evaluate quick actions
   */
  detectAction(query: string): SearchResult | null {
    const trimmed = query.trim();

    // Check for web search triggers
    for (const trigger of SEARCH_TRIGGERS) {
      if (trimmed.startsWith(trigger.prefix)) {
        const searchTerm = trimmed.slice(trigger.prefix.length).trim();
        if (searchTerm) {
          return this.createSearchResult(
            trigger.engine,
            `Search ${trigger.engine} for "${searchTerm}"`,
            `${trigger.url}${encodeURIComponent(searchTerm)}`,
            'action',
            trigger.prefix
          );
        } else {
          return null;
        }
      }
    }

    // Check for color formats (T039)
    const colorResult = this.detectColor(trimmed);
    if (colorResult) {
      return colorResult;
    }

    // Check for calculator
    if (this.isMathExpression(trimmed)) {
      return this.evaluateMath(trimmed);
    }

    // Check for URL
    if (this.isUrl(trimmed)) {
      return this.createUrlResult(trimmed);
    }

    return null;
  }

  /**
   * Detect color in various formats (T037, T039)
   */
  private detectColor(query: string): SearchResult | null {
    // Check hex color
    const hexMatch = query.match(COLOR_PATTERNS.hex);
    if (hexMatch) {
      return this.analyzeColor(hexMatch[1], 'hex');
    }

    // Check RGB color
    const rgbMatch = query.match(COLOR_PATTERNS.rgb);
    if (rgbMatch) {
      const [, r, g, b] = rgbMatch;
      return this.analyzeColor(`${r},${g},${b}`, 'rgb');
    }

    // Check HSL color
    const hslMatch = query.match(COLOR_PATTERNS.hsl);
    if (hslMatch) {
      const [, h, s, l] = hslMatch;
      return this.analyzeColor(`${h},${s},${l}`, 'hsl');
    }

    // Check named colors
    const namedMatch = query.match(COLOR_PATTERNS.named);
    if (namedMatch) {
      return this.analyzeColor(namedMatch[1], 'named');
    }

    return null;
  }

  /**
   * Check if query is a math expression
   */
  private isMathExpression(query: string): boolean {
    return CALC_PATTERNS[0].test(query) && query.length > 2;
  }

  /**
   * Evaluate math expression safely
   * Uses a simple recursive parser instead of Function() for security
   */
  private evaluateMath(query: string): SearchResult | null {
    try {
      // Only allow safe characters
      if (!/^[\d\s\+\-\*\/\(\)\.]+$/.test(query)) {
        return null;
      }

      // Use safe evaluation (tokenize and parse)
      const result = this.safeEvalMath(query);

      if (result !== null && !isNaN(result)) {
        const displayValue = Number.isInteger(result) ? result : result.toFixed(4);
        return {
          id: `calc-${Date.now()}`,
          title: displayValue.toString(),
          subtitle: `= ${query}`,
          icon: '🧮',
          type: 'action',
          score: 1,
          action: async () => {
            // TODO: Copy result to clipboard
            console.log(`Calculator result: ${displayValue}`);
          },
        };
      }
    } catch {
      // Invalid expression
    }
    return null;
  }

  /**
   * Safely evaluate math expression using recursive descent parser
   * Supports: +, -, *, /, (, )
   */
  private safeEvalMath(expr: string): number | null {
    try {
      // Remove whitespace
      const cleaned = expr.replace(/\s+/g, '');

      // Tokenize
      const tokens = this.tokenizeMath(cleaned);
      if (!tokens || tokens.length === 0) return null;

      // Parse and evaluate
      const result = this.parseExpression(tokens, 0);

      return result;
    } catch {
      return null;
    }
  }

  /**
   * Tokenize math expression into numbers and operators
   */
  private tokenizeMath(expr: string): string[] {
    const tokens: string[] = [];
    let i = 0;

    while (i < expr.length) {
      const char = expr[i];

      if (char === ' ') {
        i++;
        continue;
      }

      if (/[0-9.]/.test(char)) {
        let num = '';
        while (i < expr.length && /[0-9.]/.test(expr[i])) {
          num += expr[i];
          i++;
        }
        tokens.push(num);
      } else if (['+', '-', '*', '/', '(', ')'].includes(char)) {
        tokens.push(char);
        i++;
      } else {
        return []; // Invalid character
      }
    }

    return tokens;
  }

  /**
   * Parse expression with operator precedence
   */
  private parseExpression(tokens: string[], index: number): number {
    let pos = index;

    const parseExpression = (): number => {
      let left = parseTerm();

      while (pos < tokens.length && ['+', '-'].includes(tokens[pos])) {
        const op = tokens[pos++];
        const right = parseTerm();

        if (op === '+') {
          left += right;
        } else {
          left -= right;
        }
      }

      return left;
    };

    const parseTerm = (): number => {
      let left = parseFactor();

      while (pos < tokens.length && ['*', '/'].includes(tokens[pos])) {
        const op = tokens[pos++];
        const right = parseFactor();

        if (op === '*') {
          left *= right;
        } else {
          if (right === 0) return NaN;
          left /= right;
        }
      }

      return left;
    };

    const parseFactor = (): number => {
      if (pos >= tokens.length) return NaN;

      const token = tokens[pos++];

      if (token === '(') {
        const result = parseExpression();
        // Expect closing paren
        if (pos < tokens.length && tokens[pos] === ')') {
          pos++;
          return result;
        }
        return NaN;
      }

      if (/[0-9.]/.test(token)) {
        return parseFloat(token);
      }

      return NaN;
    };

    return parseExpression();
  }

  /**
   * Analyze and convert color (T038)
   */
  private analyzeColor(color: string, format: 'hex' | 'rgb' | 'hsl' | 'named'): SearchResult | null {
    try {
      let rgb: [number, number, number];
      let displayHex: string;

      // Convert input to RGB
      switch (format) {
        case 'hex': {
          // Expand shorthand hex (e.g., #abc -> #aabbcc)
          const expanded = color.length === 3
            ? color.split('').map(c => c + c).join('')
            : color;
          rgb = convert.hex.rgb(expanded) as [number, number, number];
          displayHex = `#${expanded.toUpperCase()}`;
          break;
        }
        case 'rgb': {
          const parts = color.split(',').map(Number);
          rgb = [parts[0], parts[1], parts[2]];
          displayHex = `#${convert.rgb.hex(rgb).toUpperCase()}`;
          break;
        }
        case 'hsl': {
          const parts = color.split(',').map(Number);
          rgb = convert.hsl.rgb([parts[0], parts[1], parts[2]]) as [number, number, number];
          displayHex = `#${convert.rgb.hex(rgb).toUpperCase()}`;
          break;
        }
        case 'named': {
          const hexColor = convert.keyword.hex(color as any);
          if (!hexColor) return null;
          rgb = convert.hex.rgb(hexColor) as [number, number, number];
          displayHex = `#${hexColor.toUpperCase()}`;
          break;
        }
        default:
          return null;
      }

      // Convert to all formats
      const hsl = convert.rgb.hsl(rgb);
      const rgbString = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
      const hslString = `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`;

      return {
        id: `color-${Date.now()}`,
        title: displayHex,
        subtitle: `${rgbString} • ${hslString}`,
        icon: '🎨',
        type: 'color',
        score: 1,
        colorData: {
          hex: displayHex,
          rgb: rgbString,
          hsl: hslString,
        },
        action: async () => {
          try {
            await invoke('paste_clipboard_item', { id: 'clipboard-temp' });
          } catch (error) {
            console.error('Failed to paste clipboard item:', error);
          }
        },
      };
    } catch (error) {
      console.error('Color conversion error:', error);
      return null;
    }
  }

  /**
   * Check if string is a URL
   * Only accept http://, https://, ftp://, and other common web protocols
   */
  private isUrl(str: string): boolean {
    try {
      const url = new URL(str);
      // Only accept common web protocols
      const allowedProtocols = ['http:', 'https:', 'ftp:', 'ftps:'];
      return allowedProtocols.includes(url.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Create URL search result
   */
  private createUrlResult(url: string): SearchResult {
    return {
      id: `url-${Date.now()}`,
      title: url,
      subtitle: 'Open in browser',
      icon: '🔗',
      type: 'url',
      score: 0.9,
      action: async () => {
        try {
          await invoke('open_url', { url });
        } catch (error) {
          console.error('[actionService] Failed to open URL via backend:', error);
        }
      },
    };
  }

  /**
   * Create search result
   */
  private createSearchResult(
    engine: string,
    title: string,
    url: string,
    type: SearchResult['type'],
    prefix: string
  ): SearchResult {
    return {
      id: `search-${engine}-${Date.now()}`,
      title,
      subtitle: `Open ${engine} search`,
      icon: '🔍',
      type,
      score: 0.95,
      source: prefix,
      action: async () => {
        try {
          await invoke('open_url', { url });
        } catch (error) {
          console.error('[actionService] Failed to open URL via backend:', error);
        }
      },
    };
  }
}

// Singleton instance
let actionServiceInstance: ActionService | null = null;

export function getActionService(): ActionService {
  if (!actionServiceInstance) {
    actionServiceInstance = new ActionService();
  }
  return actionServiceInstance;
}
