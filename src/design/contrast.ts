function channel(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number | null {
  const match = /^#([0-9a-f]{6})(?:[0-9a-f]{2})?$/i.exec(hex);
  if (!match) return null;
  const value = match[1]!;
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

export function foregroundFor(background: string): '#101012' | '#FFFFFF' {
  const value = luminance(background);
  if (value === null) return '#FFFFFF';
  const darkContrast = (value + 0.05) / 0.05;
  const lightContrast = 1.05 / (value + 0.05);
  return darkContrast >= lightContrast ? '#101012' : '#FFFFFF';
}
