'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Pencil, Trash2, X, UserPlus, Save,
  AlertTriangle, CheckCircle2, Loader2, Mail,
  Lock, User, Building, Search, SlidersHorizontal
} from 'lucide-react'
import { createUserAction, updateUserAction, deleteUserAction } from './admin-actions'

// ── Types ────────────────────────────────────────────────────────────
interface Unit {
  id: number
  nama: string
}

interface UserRow {
  id: string
  user_id: string
  unit_id: number | null
  role: string
  created_at: string
  units: { id: number; nama: string } | { id: number; nama: string }[] | null
  email?: string
  name?: string
}

interface AdminUserManagerProps {
  users: UserRow[]
  units: Unit[]
}

// ── Helper ───────────────────────────────────────────────────────────
function getUnitName(units: any): string {
  if (!units) return 'Unassigned'
  if (Array.isArray(units)) return units[0]?.nama || 'Unassigned'
  return units.nama || 'Unassigned'
}

function getUnitId(units: any): number | null {
  if (!units) return null
  if (Array.isArray(units)) return units[0]?.id || null
  return units.id || null
}

// ── Main Component ───────────────────────────────────────────────────
export default function AdminUserManager({ users, units }: AdminUserManagerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Modal states
  const [showCreate, setShowCreate] = useState(false)
  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null)

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('all')
  const [selectedRole, setSelectedRole] = useState('all')

  // Form states
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Auto-dismiss success message
  const showSuccess = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 3000)
  }

  // ── CREATE ───────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = e.currentTarget
    const formData = new FormData(form)

    const result = await createUserAction(formData)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setShowCreate(false)
      setLoading(false)
      showSuccess('User berhasil ditambahkan!')
      startTransition(() => router.refresh())
    }
  }

  // ── UPDATE ───────────────────────────────────────────────────────
  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)

    const result = await updateUserAction(formData)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setEditUser(null)
      setLoading(false)
      showSuccess('User berhasil diperbarui!')
      startTransition(() => router.refresh())
    }
  }

  // ── DELETE ───────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return
    setError(null)
    setLoading(true)

    const result = await deleteUserAction(deleteTarget.id, deleteTarget.user_id)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setDeleteTarget(null)
      setLoading(false)
      showSuccess('User berhasil dihapus!')
      startTransition(() => router.refresh())
    }
  }

  // Filtered users calculation
  const filteredUsers = users.filter((usr) => {
    const searchLower = searchQuery.toLowerCase().trim()
    const matchesSearch =
      searchLower === '' ||
      (usr.name || '').toLowerCase().includes(searchLower) ||
      (usr.email || '').toLowerCase().includes(searchLower) ||
      usr.user_id.toLowerCase().includes(searchLower)

    const unitName = getUnitName(usr.units)
    const matchesUnit = selectedUnit === 'all' || unitName === selectedUnit
    const matchesRole = selectedRole === 'all' || usr.role === selectedRole

    return matchesSearch && matchesUnit && matchesRole
  })

  return (
    <>
      {/* Success Toast */}
      {success && (
        <div className="fixed top-6 right-6 z-[60] bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-right">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          {success}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden mb-8">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Registered Portal Users</h3>
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] font-mono bg-slate-100 px-2.5 py-1 border border-slate-200 rounded-lg text-slate-600 font-semibold uppercase">
              Supabase database
            </span>
            <button
              onClick={() => { setShowCreate(true); setError(null) }}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-sm shadow-indigo-100 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah User
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative w-full md:flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Cari user berdasarkan nama, email, atau ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs text-slate-900 transition outline-none"
            />
          </div>

          {/* Filters Group */}
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            {/* Unit Filter */}
            <div className="relative flex-grow md:w-44">
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs text-slate-700 transition outline-none cursor-pointer"
              >
                <option value="all">Semua Unit</option>
                <option value="Unassigned">Unassigned</option>
                {units.map((u) => (
                  <option key={u.id} value={u.nama}>
                    {u.nama}
                  </option>
                ))}
              </select>
            </div>

            {/* Role Filter */}
            <div className="relative flex-grow md:w-36">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs text-slate-700 transition outline-none cursor-pointer"
              >
                <option value="all">Semua Role</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-mono">
              Tidak ada user yang cocok dengan pencarian / filter.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-5">User</th>
                  <th className="py-3 px-5">Unit / Division</th>
                  <th className="py-3 px-5">Role</th>
                  <th className="py-3 px-5">Joined At</th>
                  <th className="py-3 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredUsers.map((usr) => {
                  const isAdmin = usr.role === 'admin'
                  return (
                    <tr key={usr.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-5">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 truncate max-w-[200px]">
                            {usr.name || '—'}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400 truncate max-w-[200px]">
                            {usr.email || usr.user_id}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          getUnitName(usr.units) === 'IT'
                            ? 'bg-cyan-50 border-cyan-200/60 text-cyan-700'
                            : getUnitName(usr.units) === 'Unassigned'
                              ? 'bg-slate-50 border-slate-200 text-slate-500'
                              : 'bg-emerald-50 border-emerald-200/60 text-emerald-700'
                        }`}>
                          <Building className="w-3 h-3" />
                          {getUnitName(usr.units)}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                          isAdmin
                            ? 'bg-amber-50 border-amber-200/60 text-amber-700 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}>
                          {isAdmin ? 'Admin' : 'Regular User'}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 font-mono text-slate-400">
                        {new Date(usr.created_at).toLocaleDateString('id-ID', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        {!isAdmin ? (
                          <div className="flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => { setEditUser(usr); setError(null) }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                              title="Edit user"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => { setDeleteTarget(usr); setError(null) }}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                              title="Hapus user"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-300 font-mono">Protected</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── CREATE MODAL ──────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => !loading && setShowCreate(false)}>
          <div className="w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 relative" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center border border-indigo-100">
                  <UserPlus className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Tambah User Baru</h3>
              </div>
              <button onClick={() => setShowCreate(false)} disabled={loading} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition cursor-pointer disabled:opacity-50">
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200/60 rounded-xl text-red-700 flex gap-2 items-start text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="create-email" className="text-[10px] font-semibold text-slate-700 uppercase tracking-wider block">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input type="email" id="create-email" name="email" required placeholder="user@example.com"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs text-slate-900 transition outline-none" />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="create-password" className="text-[10px] font-semibold text-slate-700 uppercase tracking-wider block">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input type="password" id="create-password" name="password" required minLength={6} placeholder="Minimal 6 karakter"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs text-slate-900 transition outline-none" />
                </div>
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <label htmlFor="create-name" className="text-[10px] font-semibold text-slate-700 uppercase tracking-wider block">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input type="text" id="create-name" name="name" placeholder="John Doe"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs text-slate-900 transition outline-none" />
                </div>
              </div>

              {/* Unit */}
              <div className="space-y-1.5">
                <label htmlFor="create-unit" className="text-[10px] font-semibold text-slate-700 uppercase tracking-wider block">
                  Unit / Divisi
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Building className="w-4 h-4" />
                  </div>
                  <select id="create-unit" name="unit_id"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs text-slate-900 transition outline-none appearance-none cursor-pointer">
                    <option value="">— Pilih Unit —</option>
                    {units.map(u => (
                      <option key={u.id} value={u.id}>{u.nama}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Role indicator */}
              <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl text-[10px] text-slate-500 flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Role: <span className="font-semibold text-slate-700">Regular User</span>
                <span className="text-slate-400">(tidak bisa membuat admin baru)</span>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2.5 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} disabled={loading}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer disabled:opacity-50">
                  Batal
                </button>
                <button type="submit" disabled={loading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50">
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  {loading ? 'Menyimpan...' : 'Tambah User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ────────────────────────────────────────────── */}
      {editUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => !loading && setEditUser(null)}>
          <div className="w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 relative" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center border border-indigo-100">
                  <Pencil className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Edit User</h3>
              </div>
              <button onClick={() => setEditUser(null)} disabled={loading} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition cursor-pointer disabled:opacity-50">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* User info */}
            <div className="mb-4 p-3 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-800">{editUser.name || editUser.email || '—'}</div>
                <div className="text-[10px] font-mono text-slate-400">{editUser.email || editUser.user_id}</div>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200/60 rounded-xl text-red-700 flex gap-2 items-start text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4">
              <input type="hidden" name="id" value={editUser.id} />
              <input type="hidden" name="user_id" value={editUser.user_id} />

              {/* Name */}
              <div className="space-y-1.5">
                <label htmlFor="edit-name" className="text-[10px] font-semibold text-slate-700 uppercase tracking-wider block">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input type="text" id="edit-name" name="name" defaultValue={editUser.name || ''} placeholder="John Doe"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs text-slate-900 transition outline-none" />
                </div>
              </div>

              {/* Unit */}
              <div className="space-y-1.5">
                <label htmlFor="edit-unit" className="text-[10px] font-semibold text-slate-700 uppercase tracking-wider block">
                  Unit / Divisi
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Building className="w-4 h-4" />
                  </div>
                  <select id="edit-unit" name="unit_id" defaultValue={getUnitId(editUser.units) || ''}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs text-slate-900 transition outline-none appearance-none cursor-pointer">
                    <option value="">— Pilih Unit —</option>
                    {units.map(u => (
                      <option key={u.id} value={u.id}>{u.nama}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Password (Optional) */}
              <div className="space-y-1.5">
                <label htmlFor="edit-password" className="text-[10px] font-semibold text-slate-700 uppercase tracking-wider block">
                  Password Baru <span className="text-slate-400 lowercase font-normal">(kosongkan jika tidak ingin diubah)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input type="password" id="edit-password" name="password" minLength={6} placeholder="Minimal 6 karakter"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs text-slate-900 transition outline-none" />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2.5 pt-2">
                <button type="button" onClick={() => setEditUser(null)} disabled={loading}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer disabled:opacity-50">
                  Batal
                </button>
                <button type="submit" disabled={loading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50">
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION ────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => !loading && setDeleteTarget(null)}>
          <div className="w-full max-w-sm bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 relative" onClick={e => e.stopPropagation()}>
            {/* Warning icon */}
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-3 border border-red-100">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Hapus User?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                User <span className="font-semibold text-slate-700">{deleteTarget.name || deleteTarget.email || deleteTarget.user_id}</span> akan
                dihapus secara permanen beserta data autentikasi-nya. Tindakan ini tidak bisa dibatalkan.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200/60 rounded-xl text-red-700 flex gap-2 items-start text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-2.5">
              <button onClick={() => setDeleteTarget(null)} disabled={loading}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer disabled:opacity-50">
                Batal
              </button>
              <button onClick={handleDelete} disabled={loading}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {loading ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
