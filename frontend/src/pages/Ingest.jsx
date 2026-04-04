import { useState } from 'react'
import { api } from '../api/client.js'
import { Card, SectionHeader, Btn, Spinner } from '../components/ui.jsx'
import { CheckCircle, AlertCircle, Plus, RefreshCw } from 'lucide-react'

const CATEGORIES = ['Software', 'Office Supplies', 'Travel', 'Equipment', 'Consulting', 'Marketing', 'Training', 'Utilities', 'Meals', 'Maintenance']
const DEPARTMENTS = ['Engineering', 'Finance', 'Marketing', 'Operations', 'HR', 'Sales', 'Legal', 'IT']
const VENDORS = {
  Software:        ['Adobe Systems', 'Microsoft Corporation', 'Salesforce', 'Oracle', 'SAP'],
  'Office Supplies': ['Staples Inc', 'Office Depot', 'Amazon Business'],
  Travel:          ['Delta Airlines', 'United Airlines', 'Marriott Hotels', 'Hilton Hotels'],
  Equipment:       ['Dell Technologies', 'HP Enterprise', 'Lenovo'],
  Consulting:      ['Accenture', 'Deloitte', 'McKinsey & Company'],
  Marketing:       ['Google Ads', 'Meta Business', 'Marketing Agency Inc'],
  Training:        ['Udemy Business', 'Coursera', 'LinkedIn Learning'],
  Utilities:       ['Electric Company', 'Internet Provider', 'Phone Service Inc'],
  Meals:           ['Restaurant XYZ', 'Catering Co', 'Conference Center Dining'],
  Maintenance:     ['Facility Services', 'Cleaning Co', 'HVAC Specialists'],
}
const PAYMENT_METHODS = ['corporate_card', 'wire_transfer', 'check', 'ach_transfer']

function randomChoice(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function randomAmount(min, max) { return Math.round((Math.random() * (max - min) + min) * 100) / 100 }

function generateSample(anomalous = false) {
  const category = randomChoice(CATEGORIES)
  const dept     = randomChoice(DEPARTMENTS)
  const vendor   = anomalous
    ? randomChoice(['Offshore Consulting Ltd', 'Unknown Supplier Co', 'Unregistered Vendor LLC'])
    : randomChoice(VENDORS[category] || ['Generic Vendor Inc'])

  const hour = anomalous ? randomChoice([0, 1, 2, 23]) : Math.floor(Math.random() * 10) + 8
  const now  = new Date()
  now.setHours(hour, Math.floor(Math.random() * 60), 0, 0)

  const amount = anomalous ? randomAmount(90000, 250000) : randomAmount(100, 50000)

  return {
    transaction_id: `TXN-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`,
    timestamp:      now.toISOString().slice(0, 19),
    amount,
    category,
    vendor,
    department:     dept,
    payment_method: randomChoice(PAYMENT_METHODS),
  }
}

const FIELD_CONFIG = [
  { key: 'transaction_id', label: 'Transaction ID',  type: 'text'   },
  { key: 'timestamp',      label: 'Timestamp (ISO)', type: 'text'   },
  { key: 'amount',         label: 'Amount ($)',       type: 'number' },
  { key: 'category',       label: 'Category',         type: 'text'  },
  { key: 'vendor',         label: 'Vendor',            type: 'text' },
  { key: 'department',     label: 'Department',        type: 'text' },
  { key: 'payment_method', label: 'Payment Method',   type: 'text'  },
]

export default function Ingest() {
  const [form, setForm]       = useState(() => generateSample(false))
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState(null)

  const reset     = (anomalous = false) => {
    setForm(generateSample(anomalous))
    setResult(null)
    setError(null)
  }

  const submit = async () => {
    setLoading(true); setResult(null); setError(null)
    try {
      const payload = { ...form, amount: parseFloat(form.amount) }
      const res = await api.ingestTransaction(payload)
      setResult(res)
      // Auto-generate fresh ID for next submission
      setForm(f => ({ ...f, transaction_id: `TXN-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}` }))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 760 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em' }}>Ingest Transaction</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
          Submit a financial transaction into the agent pipeline for anomaly detection and risk assessment
        </p>
      </div>

      {/* Form */}
      <Card>
        <SectionHeader label="Transaction payload">
          <Btn small ghost onClick={() => reset(false)}>
            <RefreshCw size={11} /> Normal
          </Btn>
          <Btn small ghost onClick={() => reset(true)} style={{ color: 'var(--red)', borderColor: 'var(--red)' }}>
            <RefreshCw size={11} /> Anomalous
          </Btn>
        </SectionHeader>

        <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {FIELD_CONFIG.map(({ key, label, type }) => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{
                fontFamily: 'var(--font-mono)', fontSize: 10,
                color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
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

        <div style={{ padding: '0 20px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Btn variant="accent" onClick={submit} disabled={loading}>
            {loading
              ? <><Spinner size={13} /> Ingesting...</>
              : <><Plus size={14} /> Ingest Transaction</>}
          </Btn>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
            Use "Anomalous" to generate a suspicious transaction for testing
          </span>
        </div>
      </Card>

      {/* Success */}
      {result && (
        <Card style={{ borderColor: 'var(--green)', background: 'var(--green-dim)' }} className="animate-in">
          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle size={16} color="var(--green)" />
            <div>
              <div style={{ fontWeight: 600, color: 'var(--green)', fontSize: 13 }}>
                Transaction stored successfully
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
                ID: {result.transaction_id} · status: {result.status}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Go to ML Pipeline → Train → Score to detect anomalies
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card style={{ borderColor: 'var(--red)', background: 'var(--red-dim)' }} className="animate-in">
          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={16} color="var(--red)" />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--red)' }}>
              {error}
            </div>
          </div>
        </Card>
      )}

      {/* Pipeline hint */}
      <Card>
        <SectionHeader label="Pipeline sequence" />
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            { step: '01', label: 'Ingest',         desc: 'Submit transactions via this form',                     here: true  },
            { step: '02', label: 'Train',           desc: 'ML Pipeline → fit Isolation Forest on all data',       here: false },
            { step: '03', label: 'Score',           desc: 'ML Pipeline → assign anomaly scores to every record',  here: false },
            { step: '04', label: 'Investigate',     desc: 'Agent Decisions → LLM + SHAP risk analysis',          here: false },
            { step: '05', label: 'Forecast',        desc: 'Forecast → ARIMA spend prediction by department',     here: false },
          ].map(({ step, label, desc, here }, i, arr) => (
            <div key={step} style={{
              display: 'flex', gap: 14, alignItems: 'flex-start',
              paddingBottom: i < arr.length - 1 ? 14 : 0,
              marginBottom: i < arr.length - 1 ? 14 : 0,
              borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
                color: here ? 'var(--accent)' : 'var(--text-muted)',
                width: 24, flexShrink: 0, paddingTop: 2,
              }}>
                {step}
              </div>
              <div>
                <div style={{
                  fontSize: 13, fontWeight: here ? 600 : 400,
                  color: here ? 'var(--accent)' : 'var(--text-primary)',
                  marginBottom: 2,
                }}>
                  {label} {here && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)' }}>← you are here</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
