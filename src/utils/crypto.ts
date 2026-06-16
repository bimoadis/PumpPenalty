export async function sha256Hex(msg: string): Promise<string> {
  if (typeof window === "undefined" || !window.crypto || !window.crypto.subtle) {
    // Return a dummy value during SSR
    return "";
  }
  const buf = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(msg));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function randHex(n: number): string {
  if (typeof window === "undefined" || !window.crypto) {
    // Return a dummy value during SSR
    return "";
  }
  return Array.from(window.crypto.getRandomValues(new Uint8Array(n)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
