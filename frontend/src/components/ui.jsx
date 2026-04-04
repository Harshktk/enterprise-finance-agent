import { clsx } from 'clsx'

export function RiskBadge({ level }) {
  const map = {
    High:    { bg: 'var(--red-dim)',   color: 'var(--red)',   dot: 'var(--red)'   },
    Medium:  { bg: 'var(--amber-dim)', color: 'var(--amber)', dot: 'var(--amber)' },
    Low:     { bg: 'var(--green-dim)', color: 'var(--green)', dot: 'var(--green)' },
    UNKNOWN: { bg: 'var(--bg-raised)', color: 'var(--text-secondary)', dot: 'var(--text-muted)' },
  }
  const s = map[level] || map.UNKNOWN
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: s.bg, color: s.color,
      padding: '2px 8px', borderRadius: 4,
      fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
      letterSpacing: '0.08em', textTransform: 'uppercase',
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%',
        background: s.dot, flexShrink: 0,
        animation: level === 'High' ? 'pulse-dot 1.2s ease-in-out infinite' : 'none',
      }} />
      {level}
    </span>
  )
}

export function ActionBadge({ action }) {
  const map = {
    BLOCK_AND_ALERT:  { bg: 'var(--red-dim)',   color: 'var(--red)'   },
    REVIEW_REQUIRED:  { bg: 'var(--amber-dim)', color: 'var(--amber)' },
    AUTO_APPROVE:     { bg: 'var(--green-dim)', color: 'var(--green)' },
    FLAG_AND_ALERT:   { bg: 'var(--red-dim)',   color: 'var(--red)'   },
    LOG_ONLY:         { bg: 'var(--bg-raised)', color: 'var(--text-secondary)' },
  }
  const s = map[action] || { bg: 'var(--bg-raised)', color: 'var(--text-secondary)' }
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '2px 8px', borderRadius: 4,
      fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
      letterSpacing: '0.06em',
    }}>
      {action}
    </span>
  )
}

export function Card({ children, style, className }) {
  return (
    <div className={clsx('animate-in', className)} style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      ...style,
    }}>
      {children}
    </div>
  )
}

export function SectionHeader({ label, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 20px',
      borderBottom: '1px solid var(--border)',
    }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 11,
        color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase',
      }}>{label}</span>
      <div style={{ display: 'flex', gap: 8 }}>{children}</div>
    </div>
  )
}

export function Btn({ children, onClick, variant = 'default', disabled, small, style }) {
  const variants = {
    default: { bg: 'var(--bg-raised)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' },
    accent:  { bg: 'var(--accent)',    color: '#000',                 border: 'none' },
    danger:  { bg: 'var(--red-dim)',   color: 'var(--red)',           border: '1px solid var(--red)' },
    ghost:   { bg: 'transparent',      color: 'var(--text-secondary)', border: '1px solid var(--border)' },
  }
  const v = variants[variant]
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: v.bg, color: v.color, border: v.border,
        padding: small ? '4px 10px' : '7px 14px',
        borderRadius: 'var(--radius)',
        fontFamily: 'var(--font-display)', fontSize: small ? 12 : 13, fontWeight: 600,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'opacity 0.15s, background 0.15s',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

export function Spinner({ size = 16 }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      border: `2px solid var(--border-light)`,
      borderTopColor: 'var(--accent)',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      flexShrink: 0,
    }} />
  )
}

export function StatusPill({ ok }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontFamily: 'var(--font-mono)', fontSize: 11,
      color: ok ? 'var(--green)' : 'var(--red)',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: ok ? 'var(--green)' : 'var(--red)',
        animation: ok ? 'pulse-dot 2s ease-in-out infinite' : 'none',
      }} />
      {ok ? 'LIVE' : 'OFFLINE'}
    </span>
  )
}

export function MonoVal({ children, dim }) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 12,
      color: dim ? 'var(--text-muted)' : 'var(--text-secondary)',
    }}>
      {children}
    </span>
  )
}

export function EmptyState({ icon, message }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '48px 24px', gap: 12,
      color: 'var(--text-muted)',
    }}>
      <span style={{ fontSize: 28 }}>{icon}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{message}</span>
    </div>
  )
}
