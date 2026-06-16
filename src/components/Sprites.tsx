import React from "react";

interface SpriteProps {
  color: string;
  size?: number;
}

export function PixelKit({ color, size = 22 }: SpriteProps) {
  return (
    <svg
      width={size}
      height={(size * 26) / 22}
      viewBox="0 0 22 26"
      shapeRendering="crispEdges"
      style={{ display: "block" }}
    >
      <rect x="8" y="2" width="6" height="6" fill="#f0c08a" />
      <rect x="2" y="9" width="4" height="7" fill={color} />
      <rect x="16" y="9" width="4" height="7" fill={color} />
      <rect x="6" y="8" width="10" height="9" fill={color} />
      <rect x="6" y="17" width="10" height="4" fill="#e8edf0" />
      <rect x="7" y="21" width="3" height="5" fill="#f0c08a" />
      <rect x="12" y="21" width="3" height="5" fill="#f0c08a" />
      <rect x="7" y="25" width="3" height="1" fill="#0b0d0e" />
      <rect x="12" y="25" width="3" height="1" fill="#0b0d0e" />
    </svg>
  );
}

export function Keeper({ color, size = 40 }: SpriteProps) {
  return (
    <svg
      width={size}
      height={(size * 26) / 22}
      viewBox="0 0 22 26"
      shapeRendering="crispEdges"
      style={{ display: "block" }}
    >
      <rect x="8" y="1" width="6" height="6" fill="#f0c08a" />
      <rect x="2" y="1" width="3" height="3" fill="#f4f7f8" />
      <rect x="17" y="1" width="3" height="3" fill="#f4f7f8" />
      <rect x="2" y="4" width="3" height="9" fill={color} />
      <rect x="17" y="4" width="3" height="9" fill={color} />
      <rect x="6" y="7" width="10" height="9" fill={color} />
      <rect x="6" y="16" width="10" height="4" fill="#1b1f22" />
      <rect x="7" y="20" width="3" height="6" fill="#f0c08a" />
      <rect x="12" y="20" width="3" height="6" fill="#f0c08a" />
    </svg>
  );
}

export function Ball({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ display: "block" }}>
      <circle cx="8" cy="8" r="7" fill="#f4f7f8" stroke="#0b0d0e" strokeWidth="1" />
      <polygon points="8,4 11,6.4 9.8,10 6.2,10 5,6.4" fill="#0b0d0e" />
      <rect x="2.5" y="7" width="1.6" height="1.6" fill="#0b0d0e" />
      <rect x="12" y="7" width="1.6" height="1.6" fill="#0b0d0e" />
    </svg>
  );
}
