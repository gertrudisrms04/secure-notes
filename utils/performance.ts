export function nowMs(): number {
  if (typeof performance !== "undefined" && performance.now) {
    return performance.now();
  }

  return Date.now();
}

export function getMemoryUsageMb(): number | null {
  return null;
}
