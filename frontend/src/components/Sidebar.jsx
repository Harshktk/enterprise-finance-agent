import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ArrowDownToLine, Brain, ShieldAlert, BarChart3, MessageSquare, Settings } from 'lucide-react'
import { StatusPill } from './ui.jsx'

const NAV = [
  { to: '/',            icon: LayoutDashboard, label: 'Overview'       },
  { to: '/ingest',      icon: ArrowDownToLine, label: 'Ingest'         },
  { to: '/ml',          icon: Brain,           label: 'ML Pipeline'    },
  { to: '/agent',       icon: ShieldAlert,     label: 'Agent Decisions'},
  { to: '/forecast',    icon: BarChart3,       label: 'Forecast'       },
  { to: '/feedback',    icon: MessageSquare,   label: 'Feedback'       },
]

export default function Sidebar({ apiOk }) {
  return (
    <aside style={{
      width: 220, flexShrink: 0,
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'sticky', top: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: '20px 20px 16px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15,
          color: 'var(--text-primary)', letterSpacing: '-0.01em',
          lineHeight: 1.2,
        }}>
          FinOps<br />
          <span style={{ color: 'var(--accent)' }}>Agent</span>
        </div>
        <div style={{ marginTop: 8 }}>
          <StatusPill ok={apiOk} />
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderRadius: 'var(--radius)',
              color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
              background: isActive ? 'var(--accent-dim)' : 'transparent',
              fontWeight: isActive ? 600 : 400,
              fontSize: 13,
              transition: 'all 0.12s',
              border: isActive ? '1px solid rgba(240,165,0,0.2)' : '1px solid transparent',
            })}
          >
            <Icon size={15} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '14px 20px',
        borderTop: '1px solid var(--border)',
        fontFamily: 'var(--font-mono)', fontSize: 10,
        color: 'var(--text-muted)', letterSpacing: '0.05em',
      }}>
        ENTERPRISE FINANCE OPS<br />
        <span style={{ color: 'var(--border-light)' }}>v1.0.0 · anomaly_v1</span>
      </div>
    </aside>
  )
}
