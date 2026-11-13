import React from 'react';

interface Props {
  className?: string;
  size?: number;
}

export const AppIcon: React.FC<Props> = ({ className = 'w-6 h-6', size }) => {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      <defs>
        {/* Outer Bevel Gradient */}
        <linearGradient id="bevelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="50%" stopColor="#475569" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>

        {/* Inner Glow Border */}
        <linearGradient id="neonGlow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#00e5ff" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>

        {/* Background Gradient */}
        <radialGradient id="bgRadial" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#1e4e79" />
          <stop offset="60%" stopColor="#0d253a" />
          <stop offset="100%" stopColor="#06121e" />
        </radialGradient>

        {/* Terrain Gradient */}
        <linearGradient id="terrainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1b4931" />
          <stop offset="100%" stopColor="#0b2416" />
        </linearGradient>

        {/* Turbine Shading */}
        <linearGradient id="turbineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="45%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>

        {/* Drop Shadow Filter */}
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Outer Metallic Bevel Frame */}
      <rect
        x="24"
        y="24"
        width="464"
        height="464"
        rx="96"
        fill="#1e293b"
        stroke="url(#bevelGrad)"
        strokeWidth="14"
      />

      {/* Inner Screen Background */}
      <rect
        x="42"
        y="42"
        width="428"
        height="428"
        rx="80"
        fill="url(#bgRadial)"
      />

      {/* Neon Cyan Inner Border */}
      <rect
        x="48"
        y="48"
        width="416"
        height="416"
        rx="74"
        fill="none"
        stroke="url(#neonGlow)"
        strokeWidth="6"
        filter="url(#glow)"
        opacity="0.9"
      />

      {/* Blueprint Grid & Contour Circles */}
      <circle cx="256" cy="220" r="160" stroke="#00e5ff" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.35" />
      <circle cx="256" cy="220" r="110" stroke="#00e5ff" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.4" />
      <circle cx="256" cy="220" r="50" stroke="#00e5ff" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.5" />

      {/* Satellite Icon top left */}
      <g transform="translate(90, 85) rotate(-30) scale(0.7)" opacity="0.6">
        <rect x="10" y="5" width="20" height="12" rx="2" fill="#00e5ff" />
        <rect x="0" y="7" width="8" height="8" rx="1" fill="#38bdf8" />
        <rect x="32" y="7" width="8" height="8" rx="1" fill="#38bdf8" />
        <line x1="20" y1="17" x2="20" y2="28" stroke="#00e5ff" strokeWidth="2" />
        <circle cx="20" cy="28" r="3" fill="#00e5ff" />
      </g>

      {/* Compass / Star top right */}
      <g transform="translate(380, 95)" opacity="0.6">
        <path d="M0 -14 L4 -4 L14 0 L4 4 L0 14 L-4 4 L-14 0 L-4 -4 Z" fill="#38bdf8" />
      </g>

      {/* Green Rolling Hills in lower half */}
      <path
        d="M 44 320 Q 140 280 256 300 Q 370 320 468 285 L 468 460 L 44 460 Z"
        fill="url(#terrainGrad)"
        opacity="0.85"
      />
      <path
        d="M 44 345 Q 160 310 256 330 Q 380 350 468 320 L 468 460 L 44 460 Z"
        fill="#081c12"
        opacity="0.7"
      />

      {/* Blueprint Perspective Ground Grid */}
      <g stroke="#00e5ff" strokeWidth="1" opacity="0.4">
        {/* Longitudinal rays */}
        <line x1="256" y1="290" x2="100" y2="440" />
        <line x1="256" y1="290" x2="160" y2="445" />
        <line x1="256" y1="290" x2="256" y2="450" />
        <line x1="256" y1="290" x2="352" y2="445" />
        <line x1="256" y1="290" x2="412" y2="440" />
        {/* Latitudinal arcs */}
        <ellipse cx="256" cy="350" rx="150" ry="30" fill="none" strokeDasharray="3 3" />
        <ellipse cx="256" cy="390" rx="180" ry="40" fill="none" strokeDasharray="4 4" />
      </g>

      {/* WTG 1: Center-Rear Turbine */}
      <g>
        {/* Tower */}
        <polygon points="252,185 260,185 262,295 250,295" fill="url(#turbineGrad)" stroke="#334155" strokeWidth="1" />
        {/* Nacelle & Hub */}
        <rect x="248" y="178" width="16" height="9" rx="3" fill="#cbd5e1" stroke="#475569" strokeWidth="1" />
        <circle cx="256" cy="182" r="5" fill="#f8fafc" stroke="#334155" strokeWidth="1" />
        {/* Blades (3-blade star) */}
        {/* Blade 1 (top) */}
        <path d="M 256 182 Q 257 140 256 95 Q 253 140 256 182" fill="#ffffff" stroke="#64748b" strokeWidth="1" />
        {/* Blade 2 (bottom right) */}
        <path d="M 256 182 Q 290 200 330 220 Q 285 205 256 182" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
        {/* Blade 3 (bottom left) */}
        <path d="M 256 182 Q 220 200 182 220 Q 225 205 256 182" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />
      </g>

      {/* WTG 2: Left-Front Turbine */}
      <g>
        {/* Tower */}
        <polygon points="196,230 206,230 209,368 193,368" fill="url(#turbineGrad)" stroke="#1e293b" strokeWidth="1.5" />
        {/* Nacelle & Hub */}
        <rect x="190" y="221" width="20" height="11" rx="4" fill="#cbd5e1" stroke="#334155" strokeWidth="1" />
        <circle cx="201" cy="226" r="6" fill="#f8fafc" stroke="#1e293b" strokeWidth="1.2" />
        {/* Blades */}
        {/* Blade 1 (top) */}
        <path d="M 201 226 Q 203 175 201 125 Q 198 175 201 226" fill="#ffffff" stroke="#475569" strokeWidth="1.2" />
        {/* Blade 2 (bottom right) */}
        <path d="M 201 226 Q 240 250 286 276 Q 235 258 201 226" fill="#e2e8f0" stroke="#475569" strokeWidth="1.2" />
        {/* Blade 3 (bottom left) */}
        <path d="M 201 226 Q 160 250 116 276 Q 166 258 201 226" fill="#cbd5e1" stroke="#475569" strokeWidth="1.2" />
      </g>

      {/* WTG 3: Right-Front Turbine */}
      <g>
        {/* Tower */}
        <polygon points="311,230 321,230 324,368 308,368" fill="url(#turbineGrad)" stroke="#1e293b" strokeWidth="1.5" />
        {/* Nacelle & Hub */}
        <rect x="306" y="221" width="20" height="11" rx="4" fill="#cbd5e1" stroke="#334155" strokeWidth="1" />
        <circle cx="316" cy="226" r="6" fill="#f8fafc" stroke="#1e293b" strokeWidth="1.2" />
        {/* Blades */}
        {/* Blade 1 (top) */}
        <path d="M 316 226 Q 318 175 316 125 Q 313 175 316 226" fill="#ffffff" stroke="#475569" strokeWidth="1.2" />
        {/* Blade 2 (bottom right) */}
        <path d="M 316 226 Q 355 250 401 276 Q 350 258 316 226" fill="#e2e8f0" stroke="#475569" strokeWidth="1.2" />
        {/* Blade 3 (bottom left) */}
        <path d="M 316 226 Q 275 250 231 276 Q 281 258 316 226" fill="#cbd5e1" stroke="#475569" strokeWidth="1.2" />
      </g>

      {/* Dimension Line 5D (Front WTG2 to WTG3) */}
      <g>
        <line x1="206" y1="365" x2="311" y2="365" stroke="#ffffff" strokeWidth="2.5" />
        {/* Left Arrowhead */}
        <polygon points="206,365 214,361 214,369" fill="#ffffff" />
        {/* Right Arrowhead */}
        <polygon points="311,365 303,361 303,369" fill="#ffffff" />
        {/* 5D Badge Text */}
        <rect x="238" y="348" width="40" height="22" rx="4" fill="#091c2b" stroke="#00e5ff" strokeWidth="1" />
        <text x="258" y="364" fill="#ffffff" fontSize="13" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">
          5D
        </text>
      </g>

      {/* Dimension Line 7D (Diagonal WTG2 to Rear WTG1) */}
      <g>
        <line x1="203" y1="358" x2="252" y2="295" stroke="#ffffff" strokeWidth="2.5" />
        {/* Bottom-left Arrowhead */}
        <polygon points="203,358 206,348 214,354" fill="#ffffff" />
        {/* Top-right Arrowhead */}
        <polygon points="252,295 249,305 241,299" fill="#ffffff" />
        {/* 7D Badge Text */}
        <rect x="216" y="312" width="40" height="22" rx="4" fill="#091c2b" stroke="#00e5ff" strokeWidth="1" />
        <text x="236" y="328" fill="#ffffff" fontSize="13" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">
          7D
        </text>
      </g>

      {/* Lower "WSP" Badge & Code snippet */}
      <g transform="translate(256, 420)">
        <rect x="-24" y="-12" width="48" height="20" rx="4" fill="#071926" stroke="#00e5ff" strokeWidth="1" opacity="0.8" />
        <text x="0" y="2" fill="#38bdf8" fontSize="11" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">
          WSP
        </text>
      </g>
      <text x="380" y="445" fill="#38bdf8" fontSize="9" fontFamily="monospace" opacity="0.6" textAnchor="end">
        const spacing_5D = D * 5;
      </text>
    </svg>
  );
};
