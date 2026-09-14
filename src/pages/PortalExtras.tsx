import { useState } from 'react'
import { useStore } from '../store/Store'
import { Avatar, Button, FormActions, PageHeader } from '../components/ui'
import { fullName, roleLabel } from '../types'

export function ProfilePage() {
  const { currentUser, state, updateProfile } = useStore()
  const [phone, setPhone] = useState(currentUser?.phone ?? '')
  const [address, setAddress] = useState(currentUser?.address ?? '')
  const [emergencyContact, setEmergencyContact] = useState(currentUser?.emergencyContact ?? '')
  const [emergencyPhone, setEmergencyPhone] = useState(currentUser?.emergencyPhone ?? '')

  if (!currentUser) return null
  const dept = state.departments.find((d) => d.id === currentUser.departmentId)

  return (
    <>
      <PageHeader kicker="My account" title="My Profile" lede="Keep your contact details current." />
      <div className="card" style={{ padding: 20, maxWidth: 720 }}>
        <div className="person" style={{ marginBottom: 16 }}>
          <Avatar employee={currentUser} />
          <div>
            <strong style={{ color: 'var(--ink)', fontSize: 18 }}>{fullName(currentUser)}</strong>
            <div className="lede">{currentUser.position} · {roleLabel(currentUser.role)}</div>
            <div className="lede">{dept?.name} · {currentUser.employeeId}</div>
          </div>
        </div>
        <form onSubmit={(e) => {
          e.preventDefault()
          updateProfile(currentUser.id, { phone, address, emergencyContact, emergencyPhone })
        }}>
          <div className="field"><label>Email</label><input className="input" value={currentUser.email} disabled /></div>
          <div className="field" style={{ marginTop: 10 }}><label>Phone</label><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div className="field" style={{ marginTop: 10 }}><label>Address</label><textarea className="textarea" value={address} onChange={(e) => setAddress(e.target.value)} /></div>
          <div className="row" style={{ marginTop: 10 }}>
            <div className="field"><label>Emergency contact</label><input className="input" value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} /></div>
            <div className="field"><label>Emergency phone</label><input className="input" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} /></div>
          </div>
          <div style={{ marginTop: 16 }}>
            <Button type="submit" variant="gold">Save profile</Button>
          </div>
        </form>
      </div>
    </>
  )
}

export function PayslipsPage() {
  const { currentUser } = useStore()
  if (!currentUser) return null
  const gross = currentUser.basicSalary + currentUser.housingAllowance + currentUser.transportAllowance + currentUser.otherAllowance
  const tax = Math.round(gross * currentUser.taxRate)
  const net = gross - tax
  const months = ['August 2026', 'July 2026', 'June 2026']

  return (
    <>
      <PageHeader kicker="Compensation" title="My Payslips" lede="Summary of recent payroll for your account." />
      <div className="card" style={{ padding: 20, maxWidth: 720 }}>
        <p className="lede">Bank: {currentUser.bankName || '—'} · {currentUser.accountNumber || '—'}</p>
        <table className="table" style={{ marginTop: 12, width: '100%' }}>
          <thead>
            <tr>
              <th>Period</th>
              <th>Gross</th>
              <th>Tax</th>
              <th>Net</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m}>
                <td>{m}</td>
                <td>ZMW {gross.toLocaleString()}</td>
                <td>ZMW {tax.toLocaleString()}</td>
                <td><strong>ZMW {net.toLocaleString()}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export function NotificationsPage() {
  const { state, currentUser, markNotificationRead, markAllRead } = useStore()
  if (!currentUser) return null
  const notes = state.notifications.filter((n) => n.userId === currentUser.id)

  return (
    <>
      <PageHeader
        kicker="Inbox"
        title="Notifications"
        lede="Leave, attendance, and internship updates for your account."
        actions={notes.some((n) => !n.read) ? <Button variant="ghost" onClick={() => markAllRead(currentUser.id)}>Mark all read</Button> : null}
      />
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {notes.length === 0 ? (
          <div className="empty" style={{ padding: 32 }}><p>No notifications yet.</p></div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {notes.map((n) => (
              <li
                key={n.id}
                style={{
                  padding: '14px 18px',
                  borderBottom: '1px solid var(--line, rgba(0,0,0,.06))',
                  opacity: n.read ? 0.7 : 1,
                  cursor: 'pointer',
                }}
                onClick={() => markNotificationRead(n.id)}
              >
                <strong style={{ color: 'var(--ink)' }}>{n.title}</strong>
                <div className="lede">{n.body}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

export function SettingsPage() {
  const { state, currentUser, updateSettings, resetDemo, toast } = useStore()
  const [companyName, setCompanyName] = useState(state.settings.companyName)
  const [email, setEmail] = useState(state.settings.email)
  const [phone, setPhone] = useState(state.settings.phone)

  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager' && currentUser.role !== 'super_admin')) {
    return (
      <div className="card empty">
        <h3>Access Denied</h3>
        <p>Settings are limited to HR Managers and Administrators.</p>
      </div>
    )
  }

  return (
    <>
      <PageHeader kicker="Organisation" title="Settings" lede="Company details used across Aurelia People." />
      <div className="card" style={{ padding: 20, maxWidth: 640 }}>
        <form onSubmit={(e) => {
          e.preventDefault()
          updateSettings({ companyName, email, phone })
        }}>
          <div className="field"><label>Company name</label><input className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></div>
          <div className="field" style={{ marginTop: 10 }}><label>People email</label><input className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="field" style={{ marginTop: 10 }}><label>Phone</label><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <FormActions onCancel={() => toast('No changes discarded.')} submitLabel="Save settings" />
        </form>
        {currentUser.role === 'admin' ? (
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--line, rgba(0,0,0,.08))' }}>
            <Button variant="danger" onClick={() => resetDemo()}>Restore demo data</Button>
          </div>
        ) : null}
      </div>
    </>
  )
}

export function PayrollPage() {
  const { state } = useStore()
  const active = state.employees.filter((e) => e.status !== 'Inactive')
  return (
    <>
      <PageHeader kicker="Compensation" title="Payroll" lede="High-level payroll overview for active employees." />
      <DataTableStub rows={active.slice(0, 12).map((e) => ({
        name: fullName(e),
        gross: e.basicSalary + e.housingAllowance + e.transportAllowance + e.otherAllowance,
      }))} />
    </>
  )
}

function DataTableStub({ rows }: { rows: { name: string; gross: number }[] }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'auto' }}>
      <table className="table" style={{ width: '100%' }}>
        <thead>
          <tr><th>Employee</th><th>Gross (ZMW)</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td>{r.name}</td>
              <td>{r.gross.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function RecruitmentPage() {
  return (
    <>
      <PageHeader kicker="Hiring" title="Recruitment" lede="Track openings alongside Internship Management for student placements." />
      <div className="card empty">
        <h3>Recruitment board</h3>
        <p>Use Internship Management for internship openings. Permanent roles can be tracked here as your process expands.</p>
      </div>
    </>
  )
}

export function PerformancePage() {
  return (
    <>
      <PageHeader kicker="Growth" title="Performance Management" lede="Review cycles and goals for your teams." />
      <div className="card empty">
        <h3>Performance reviews</h3>
        <p>Schedule and capture reviews here without changing your existing Aurelia visual system.</p>
      </div>
    </>
  )
}
