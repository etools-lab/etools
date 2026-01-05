# Color Conversion API Contract

**Feature**: 002-mvp-completion | **Module**: Quick Actions (Color Conversion)
**Purpose**: Frontend service for color format detection and conversion

---

## Overview

Color conversion is implemented as a frontend quick action (not a Tauri command) since it's purely computational and doesn't require backend access. The color detection and conversion logic lives in `actionService.ts`.

---

## Frontend Service

### Location

`src/services/actionService.ts`

### Color Detection Patterns

```typescript
// Regex patterns for color format detection
const COLOR_PATTERNS = {
  // Hex: #rgb, #rrggbb, #rrggbbaa
  HEX: /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i,

  // RGB: rgb(r, g, b) or rgba(r, g, b, a)
  RGB: /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)$/i,

  // HSL: hsl(h, s%, l%) or hsla(h, s%, l%, a)
  HSL: /^hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(?:,\s*[\d.]+\s*)?\)$/i,

  // Named colors (CSS color keywords)
  NAMED: /^(red|blue|green|yellow|orange|purple|pink|black|white|gray|grey|...)$/i,
};
```

### Color Conversion Function

```typescript
import convert from 'color-convert';

interface ColorConversion {
  input: string;
  hex: string;
  rgb: string;
  hsl: string;
  named?: string;
  swatch: string;  // CSS color string for preview
}

function convertColor(input: string): ColorConversion | null {
  try {
    // Normalize input and detect format
    const normalized = input.trim().toLowerCase();

    // Check if it's a valid color
    if (!isValidColor(normalized)) {
      return null;
    }

    // Convert to RGB (universal format)
    const rgb = convert.rgb(normalized);  // [r, g, b] or [r, g, b, a]

    // Convert to all formats
    const result: ColorConversion = {
      input,
      hex: toHex(rgb),
      rgb: toRgbString(rgb),
      hsl: toHslString(rgb),
      swatch: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`,
    };

    // Check for named color equivalent
    const named = findNamedColor(rgb);
    if (named) {
      result.named = named;
    }

    return result;
  } catch {
    return null;
  }
}
```

### Integration with Search Hook

```typescript
// In src/hooks/useSearch.ts

// Add color detection to search logic
if (colorService.isColorInput(query)) {
  const colorResult = colorService.convertColor(query);

  if (colorResult) {
    return {
      results: [{
        id: `color-${Date.now()}`,
        title: `${colorResult.hex} = ${colorResult.rgb}`,
        subtitle: `${colorResult.hsl}${colorResult.named ? ` = ${colorResult.named}` : ''}`,
        icon: '🎨',
        type: 'color',
        score: 1,
        action: async () => {
          await navigator.clipboard.writeText(colorResult.hex);
        },
      }],
    };
  }
}
```

---

## Color Result Display Component

### Location

`src/components/ColorResultItem.tsx`

### Props

```typescript
interface ColorResultItemProps {
  conversion: ColorConversion;
  onSelect?: (format: string) => void;
}
```

### Component Structure

```tsx
export function ColorResultItem({ conversion, onSelect }: ColorResultItemProps) {
  return (
    <div className="color-result">
      {/* Color swatch preview */}
      <div
        className="color-swatch"
        style={{ backgroundColor: conversion.swatch }}
      />

      {/* Format conversions */}
      <div className="color-formats">
        <div className="color-format">
          <label>Hex</label>
          <code>{conversion.hex}</code>
          <button onClick={() => onSelect?.(conversion.hex)}>Copy</button>
        </div>

        <div className="color-format">
          <label>RGB</label>
          <code>{conversion.rgb}</code>
          <button onClick={() => onSelect?.(conversion.rgb)}>Copy</button>
        </div>

        <div className="color-format">
          <label>HSL</label>
          <code>{conversion.hsl}</code>
          <button onClick={() => onSelect?.(conversion.hsl)}>Copy</button>
        </div>

        {conversion.named && (
          <div className="color-format">
            <label>Named</label>
            <code>{conversion.named}</code>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Supported Color Formats

### Hex Formats

| Format | Example | Description |
|--------|---------|-------------|
| 3-digit | `#fc0` | Short form, expands to `#ffcc00` |
| 6-digit | `#ffcc00` | Standard RGB hex |
| 8-digit | `#ffcc0080` | RGB with alpha channel |

### RGB Formats

| Format | Example | Description |
|--------|---------|-------------|
| rgb() | `rgb(255, 0, 0)` | Red, green, blue (0-255) |
| rgba() | `rgba(255, 0, 0, 0.5)` | RGB with alpha (0-1) |

### HSL Formats

| Format | Example | Description |
|--------|---------|-------------|
| hsl() | `hsl(0, 100%, 50%)` | Hue, saturation, lightness |
| hsla() | `hsla(0, 100%, 50%, 0.5)` | HSL with alpha |

### Named Colors

All 147 CSS named colors:
- Basic: `red`, `blue`, `green`, `yellow`, etc.
- Shades: `darkred`, `lightblue`, `pink`, etc.
- Special: `transparent`, `currentColor`

---

## Validation Rules

### Range Validation

| Format | Component | Range |
|--------|-----------|-------|
| RGB | Red/Green/Blue | 0-255 |
| RGB | Alpha | 0-1 |
| HSL | Hue | 0-360 |
| HSL | Saturation | 0-100% |
| HSL | Lightness | 0-100% |

### Error Handling

- Invalid format → Return `null` (no error thrown)
- Out-of-range values → Clamp to valid range
- Invalid named color → Return `null`

---

## Performance Requirements

- Color detection: <10ms (regex match)
- Color conversion: <50ms (color-convert library)
- Result display: Instant (no network calls)

---

## Dependencies

```json
// package.json
{
  "color-convert": "^2.0.1"
}
```

---

## Examples

### Input → Output Mapping

| Input | Hex | RGB | HSL |
|-------|-----|-----|-----|
| `#f00` | `#ff0000` | `rgb(255, 0, 0)` | `hsl(0, 100%, 50%)` |
| `rgb(0, 255, 0)` | `#00ff00` | `rgb(0, 255, 0)` | `hsl(120, 100%, 50%)` |
| `hsl(240, 100%, 50%)` | `#0000ff` | `rgb(0, 0, 255)` | `hsl(240, 100%, 50%)` |
| `tomato` | `#ff6347` | `rgb(255, 99, 71)` | `hsl(9, 100%, 64%)` |
| `#ff000080` | `#ff000080` | `rgba(255, 0, 0, 0.5)` | `hsla(0, 100%, 50%, 0.5)` |

### User Flow

```
1. User types "#ff0000" in search
2. actionService.detectAction() recognizes color format
3. convertColor() generates all formats
4. ColorResultItem displays conversions with color swatch
5. User clicks "Copy" next to desired format
6. Format copied to clipboard
```

---

## Testing

### Unit Tests

```typescript
describe('ColorConversion', () => {
  it('should detect hex colors', () => {
    expect(isValidColor('#ff0000')).toBe(true);
    expect(isValidColor('#f00')).toBe(true);
    expect(isValidColor('#ff000080')).toBe(true);
  });

  it('should detect RGB colors', () => {
    expect(isValidColor('rgb(255, 0, 0)')).toBe(true);
    expect(isValidColor('rgba(255, 0, 0, 0.5)')).toBe(true);
  });

  it('should detect HSL colors', () => {
    expect(isValidColor('hsl(0, 100%, 50%)')).toBe(true);
    expect(isValidColor('hsla(0, 100%, 50%, 0.5)')).toBe(true);
  });

  it('should detect named colors', () => {
    expect(isValidColor('red')).toBe(true);
    expect(isValidColor('tomato')).toBe(true);
  });

  it('should convert hex to RGB', () => {
    const result = convertColor('#ff0000');
    expect(result?.rgb).toBe('rgb(255, 0, 0)');
  });

  it('should convert RGB to HSL', () => {
    const result = convertColor('rgb(0, 255, 0)');
    expect(result?.hsl).toBe('hsl(120, 100%, 50%)');
  });

  it('should handle alpha channel', () => {
    const result = convertColor('rgba(255, 0, 0, 0.5)');
    expect(result?.hex).toBe('#ff000080');
  });

  it('should return null for invalid input', () => {
    expect(convertColor('not-a-color')).toBeNull();
    expect(convertColor('#gggggg')).toBeNull();
  });
});
```

### E2E Test

```typescript
test('color conversion workflow', async ({ page }) => {
  // Open launcher
  await page.keyboard.press('Alt+Space');

  // Type color
  await page.fill('[data-testid="search-input"]', '#ff0000');

  // Wait for color result
  await page.waitForSelector('.color-result');

  // Verify conversions
  await expect(page.locator('.color-format')).toContainText(['#ff0000', 'rgb(255, 0, 0)', 'hsl(0, 100%, 50%)']);

  // Copy hex format
  await page.click('.color-format button', { hasText: 'Copy' });

  // Verify clipboard
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toBe('#ff0000');
});
```

---

## Future Enhancements (Out of Scope for MVP)

- CMYK color format (for print design)
- LAB color space (for perceptual uniformity)
- Color palette generation from single color
- Contrast ratio checker for accessibility
- Color blindness simulation preview
