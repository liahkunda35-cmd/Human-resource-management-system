import { useMemo, useState } from 'react'
import { useStore } from '../store/Store'
import { Avatar, Badge, Button, DataTable, FormActions, Modal, PageHeader, RowActions, statusTone } from '../components/ui'
import { fullName, roleLabel } from '../types'

export function AdminsPage() {
  const { state, currentUser, createAdminAccount, resendAdminCredentials, toast } = useStore()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [position, setPosition] = useState('Administrator')

  const rows = useMemo(() => {
    const s = q.toLowerCase()
    return state.employees.filter((e) => {
      if (e.role !== 'admin') return false
      if (!s) return true
      return `${fullName(e)} ${e.email}`.toLowerCase().includes(s)
    })
  }, [q, state.employees])

  if (!currentUser || currentUser.role !== 'super_admin') {
    return (
      <div className="card empty">
        <h3>Access Denied</h3>
        <p>Only Super Administrators can create and manage Administrator accounts.</p>
      </div>
    )
  }

  return (
    <>
      <PageHeader
        kicker="Administration"
        title="Admin Management"
        lede="Create Administrator accounts. Temporary passwords are emailed through Nexus — never shown in the browser."
        actions={<Button variant="gold" onClick={() => setOpen(true)}>Create Admin</Button>}
      />
      <div className="filters">
        <input className="input" placeholder="Search administrators" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <DataTable empty={rows.length === 0} emptyTitle="No administrators" emptyBody="Create an Administrator to manage employees.">
        <thead>
          <tr>
            <th>Admin</th>
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
                        const result = await resendAdminCredentials(e.id)
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

      <Modal open={open} title="Create Administrator" onClose={() => !busy && setOpen(false)}>
        <form
          onSubmit={async (ev) => {
            ev.preventDefault()
            setBusy(true)
            const result = await createAdminAccount({
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
            setPosition('Administrator')
          }}
        >
          <div className="row">
            <div className="field"><label>First name</label><input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></div>
            <div className="field"><label>Last name</label><input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} required /></div>
          </div>
          <div className="field" style={{ marginTop: 10 }}><label>Email</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div className="field" style={{ marginTop: 10 }}><label>Phone</label><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div className="field" style={{ marginTop: 10 }}><label>Position</label><input className="input" value={position} onChange={(e) => setPosition(e.target.value)} /></div>
          <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
            A secure temporary password is generated on the server, stored only as a hash, and emailed with the Nexus <code>admin_created</code> template. It is never shown here.
          </p>
          <FormActions onCancel={() => setOpen(false)} submitLabel={busy ? 'Creating…' : 'Create Admin'} />
        </form>
      </Modal>
    </>
  )
}
