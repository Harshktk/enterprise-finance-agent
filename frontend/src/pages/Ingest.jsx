import { useState } from 'react'
import { api } from '../api/client.js'
import { Card, SectionHeader, Btn, Spinner } from '../components/ui.jsx'
import { CheckCircle, AlertCircle, Plus } from 'lucide-react'

const SAMPLE = {
  transaction_id: `TXN-${Date.now()}`,
  timestamp: new Date().toISOString().slice(0, 19),
  amount: 87450,
  category: 'Software',
  vendor: 'CloudVendor Inc',
  department: 'Engineering',
  payment_method: 'wire_transfer',
}

const FIELD_CONFIG = [
  { key: 'transaction_id', label: 'Transaction ID', type: 'text' },
  { key: 'timestamp',      label: 'Timestamp (ISO)', type: 'text' },
  { key: 'amount',         label: 'Amount ($)',      type: 'number' },
  { key: 'category',       label: 'Category',        type: 'text' },
  { key: 'vendor',         label: 'Vendor',          type: 'text' },
  { key: 'department',     label: 'Department',      type: 'text' },
  { key: 'payment_method', label: 'Payment Method',  type: 'text' },
]

export default function Ingest() {
  const [form, setForm] = useState(SAMPLE)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const reset = () => {
    setForm({ ...SAMPLE, transaction_id: `TXN-${Date.now()}`, timestamp: new Date().toISOString().slice(0,19) })
    setResult(null); setError(null)
  }

  const submit = async () => {
    setLoading(true); setResult(null); setError(null)
    try {
      const payload = { ...form, amount: parseFloat(form.amount) }
      const res = await api.ingestTransaction(payload)
      setResult(res)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 760 }}>
      <div>
        <h1 style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em' }}>Ingest Transaction</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
          Submit a financial transaction to the agent pipeline
        </p>
      </div>

      <Card>
        <SectionHeader label="Transaction payload">
          <Btn small ghost onClick={reset}>Reset to sample</Btn>
        </SectionHeader>
        <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {FIELD_CONFIG.map(({ key, label, type }) => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {label}
              </label>
              <input
                type={type}
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <div style={{ padding: '0 20px 20px', display: 'flex', gap: 10 }}>
          <Btn variant="accent" onClick={submit} disabled={loading}>
            {loading ? <><Spinner size={13} /> Ingesting...</> : <><Plus size={14} /> Ingest Transaction</>}
          </Btn>
        </div>
      </Card>

      {result && (
        <Card style={{ borderColor: 'var(--green)', background: 'var(--green-dim)' }} className="animate-in">
          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle size={16} color="var(--green)" />
            <div>
              <div style={{ fontWeight: 600, color: 'var(--green)', fontSize: 13 }}>Transaction stored successfully</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
                ID: {result.transaction_id} · status: {result.status}
              </div>
            </div>
          </div>
        </Card>
      )}

      {error && (
        <Card style={{ borderColor: 'var(--red)', background: 'var(--red-dim)' }} className="animate-in">
          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={16} color="var(--red)" />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--red)' }}>{error}</div>
          </div>
        </Card>
      )}

      {/* Bulk hint */}
      <Card>
        <SectionHeader label="Bulk seeding" />
        <div style={{ padding: '16px 20px' }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            To load sample transactions in bulk, run the seed script from your local machine:
          </p>
          <div style={{
            marginTop: 12, padding: '12px 16px',
            background: 'var(--bg-base)', borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)',
          }}>
            python generate_transactions.py
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, fontFamily: 'var(--font-mono)' }}>
            Then run ML → Train to build the anomaly model on the seeded data.
          </p>
        </div>
      </Card>
    </div>
  )
}
