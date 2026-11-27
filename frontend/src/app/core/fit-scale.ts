export function scaleToFit(availableWidth: number, contentWidth: number): number {
  if (!(contentWidth > 0) || !(availableWidth > 0)) {
    return 1;
  }
  return Math.min(1, availableWidth / contentWidth);
}
