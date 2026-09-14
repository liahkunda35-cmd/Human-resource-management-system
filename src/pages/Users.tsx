import { useMemo, useState } from 'react'
import { useStore } from '../store/Store'
import { Avatar, Badge, Button, DataTable, FormActions, Modal, PageHeader, RowActions, statusTone } from '../components/ui'
import { fullName, roleLabel } from '../types'

/** Administrators create employees; credentials emailed via Nexus user_created. */
export function UsersPage() {
  const { state, currentUser, createEmployeeAccount, resendEmployeeCredentials, toast } = useStore()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [position, setPosition] = useState('Team Member')
  const rows = useMemo(() => {
    const s = q.toLowerCase()
    return state.employees.filter((e) => {
      if (e.role !== 'employee') return false
      if (!s) return true
      return `${fullName(e)} ${e.email}`.toLowerCase().includes(s)
    })
  }, [q, state.employees])

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="card empty">
        <h3>Access Denied</h3>
        <p>Only Administrators can create Employee accounts. Super Administrators manage Admins under Admin Management.</p>
      </div>
    )
  }

  return (
    <>
      <PageHeader
        kicker="People"
        title="Employee Accounts"
        lede="Create employee accounts. Temporary passwords are emailed through Nexus — never displayed in the app."
        actions={<Button variant="gold" onClick={() => setOpen(true)}>Create Employee</Button>}
      />
      <div className="filters">
        <input className="input" placeholder="Search employees" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <DataTable empty={rows.length === 0} emptyTitle="No employees" emptyBody="Create an employee account to get started.">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.id}>
              <td>
                <div className="person">
                  <Avatar employee={e} size="sm" />
                  <strong style={{ color: 'var(--ink)' }}>{fullName(e)}</strong>
                </div>
              </td>
              <td>{e.email}</td>
              <td><Badge tone="gold">{roleLabel(e.role)}</Badge></td>
              <td><Badge tone={statusTone(e.status)}>{e.status}</Badge></td>
              <td>
                <RowActions
                  items={[
                    {
                      label: 'Resend Login Credentials',
                      onClick: async () => {
                        const result = await resendEmployeeCredentials(e.id)
                        if (result.error) toast(result.error, 'error')
                      },
                    },
                  ]}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>

      <Modal open={open} title="Create Employee" onClose={() => !busy && setOpen(false)}>
        <form
          onSubmit={async (ev) => {
            ev.preventDefault()
            setBusy(true)
            const result = await createEmployeeAccount({
              firstName,
              lastName,
              email,
              phone,
              position,
            })
            setBusy(false)
            if (result.error) {
              toast(result.error, 'error')
              return
            }
            setOpen(false)
            setFirstName('')
            setLastName('')
            setEmail('')
            setPhone('')
            setPosition('Team Member')
          }}
        >
          <div className="row">
            <div className="field"><label>First name</label><input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></div>
            <div className="field"><label>Last name</label><input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} required /></div>
          </div>
          <div className="field" style={{ marginTop: 10 }}><label>Email</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div className="field" style={{ marginTop: 10 }}><label>Phone</label><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div className="field" style={{ marginTop: 10 }}>
            <label>Position</label>
            <input className="input" value={position} onChange={(e) => setPosition(e.target.value)} />
          </div>
          <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
            A secure temporary password is generated on the server, stored only as a hash, and emailed with the Nexus <code>user_created</code> template.
          </p>
          <FormActions onCancel={() => setOpen(false)} submitLabel={busy ? 'Creating…' : 'Create Employee'} />
        </form>
      </Modal>
    </>
  )
}
