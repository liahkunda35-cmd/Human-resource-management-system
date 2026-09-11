import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/Store'
import { Avatar, Button, ConfirmDialog, DataTable, EmptyState, FormActions, Modal, PageHeader, RowActions } from '../components/ui'
import { fullName } from '../types'

export function DepartmentsPage() {
  const { state, addDepartment, saveDepartment, deleteDepartment, saveEmployee, toast } = useStore()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [managerId, setManagerId] = useState('')
  const [description, setDescription] = useState('')
  const [kill, setKill] = useState<string | null>(null)
  const [view, setView] = useState<string | null>(null)
  const [assignId, setAssignId] = useState('')

  function startAdd() {
    setEditId(null)
    setName('')
    setManagerId(state.employees.find((e) => e.role === 'manager')?.id ?? '')
    setDescription('')
    setOpen(true)
  }

  function startEdit(id: string) {
    const d = state.departments.find((x) => x.id === id)
    if (!d) return
    setEditId(id)
    setName(d.name)
    setManagerId(d.managerId ?? '')
    setDescription(d.description)
    setOpen(true)
  }

  const members = state.employees.filter((e) => e.departmentId === view && e.status !== 'Inactive')
  const assignable = state.employees.filter((e) => e.status !== 'Inactive' && e.departmentId !== view)

  return (
    <>
      <PageHeader
        kicker="Organisation"
        title="Departments"
        lede="Add departments and assign people to the right team."
        actions={<Button variant="gold" onClick={startAdd}>Add department</Button>}
      />
      <DataTable empty={state.departments.length === 0} emptyTitle="No departments" emptyBody="Add a department to organise people.">
        <thead>
          <tr>
            <th>Department</th>
            <th>Manager</th>
            <th>People</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {state.departments.map((d) => {
            const count = state.employees.filter((e) => e.departmentId === d.id && e.status !== 'Inactive').length
            const mgr = state.employees.find((e) => e.id === d.managerId)
            return (
              <tr key={d.id}>
                <td><strong style={{ color: 'var(--ink)' }}>{d.name}</strong></td>
                <td>{mgr ? fullName(mgr) : '—'}</td>
                <td>{count}</td>
                <td>
                  <RowActions items={[
                    { label: 'Assign people', onClick: () => { setView(d.id); setAssignId('') } },
                    { label: 'Edit', onClick: () => startEdit(d.id) },
                    { label: 'Delete', danger: true, onClick: () => setKill(d.id) },
                  ]} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </DataTable>
      <Modal open={open} title={editId ? 'Edit department' : 'Add department'} onClose={() => setOpen(false)}>
        <form onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return
          const payload = { name, managerId: managerId || null, description }
          if (editId) saveDepartment(editId, payload)
          else addDepartment(payload)
          setOpen(false)
        }}>
          <div className="field"><label>Name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div className="field" style={{ marginTop: 10 }}>
            <label>Manager</label>
            <select className="select" value={managerId} onChange={(e) => setManagerId(e.target.value)}>
              <option value="">Unassigned</option>
              {state.employees.filter((e) => e.role !== 'employee').map((e) => <option key={e.id} value={e.id}>{fullName(e)}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginTop: 10 }}>
            <label>Description</label>
            <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <FormActions onCancel={() => setOpen(false)} />
        </form>
      </Modal>
      <Modal
        open={Boolean(view)}
        title={state.departments.find((d) => d.id === view)?.name ?? 'Department people'}
        onClose={() => setView(null)}
      >
        <div className="field" style={{ marginBottom: 14 }}>
          <label>Assign employee</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <select className="select" value={assignId} onChange={(e) => setAssignId(e.target.value)} style={{ flex: 1 }}>
              <option value="">Select employee…</option>
              {assignable.map((e) => (
                <option key={e.id} value={e.id}>
                  {fullName(e)} · {state.departments.find((d) => d.id === e.departmentId)?.name ?? 'No dept'}
                </option>
              ))}
            </select>
            <Button
              variant="gold"
              type="button"
              disabled={!assignId || !view}
              onClick={() => {
                if (!assignId || !view) return
                const emp = state.employees.find((e) => e.id === assignId)
                const mgr = state.departments.find((d) => d.id === view)?.managerId ?? null
                saveEmployee(assignId, { departmentId: view, managerId: mgr || emp?.managerId || null })
                toast(`${emp ? fullName(emp) : 'Employee'} assigned.`)
                setAssignId('')
              }}
            >
              Assign
            </Button>
          </div>
        </div>
        {members.map((e) => (
          <div key={e.id} className="person" style={{ padding: '8px 0', justifyContent: 'space-between' }}>
            <Link to={`/app/employees/${e.id}`} style={{ display: 'flex', gap: 12, textDecoration: 'none', alignItems: 'center' }}>
              <Avatar employee={e} />
              <div><strong>{fullName(e)}</strong><span>{e.position}</span></div>
            </Link>
          </div>
        ))}
        {members.length === 0 ? (
          <EmptyState title="Empty department" body="Assign an employee above to build this team." />
        ) : null}
      </Modal>
      <ConfirmDialog
        open={Boolean(kill)}
        title="Delete department?"
        body="This cannot be undone. Active employees must be moved first."
        danger
        confirmLabel="Delete"
        onClose={() => setKill(null)}
        onConfirm={() => {
          if (!kill) return
          const err = deleteDepartment(kill)
          if (err) toast(err, 'error')
          setKill(null)
        }}
      />
    </>
  )
}
