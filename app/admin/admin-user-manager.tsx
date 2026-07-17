'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Pencil, Trash2, X, UserPlus, Save,
  AlertTriangle, CheckCircle2, Loader2, Mail,
  Lock, User, Building, Search, SlidersHorizontal,
  Upload, FileImage, Folder, Eye, Trash
} from 'lucide-react'
import {
  createUserAction, updateUserAction, deleteUserAction,
  createUnitAction, updateUnitAction, deleteUnitAction
} from './admin-actions'

// ── Types ────────────────────────────────────────────────────────────
interface Unit {
  id: number
  nama: string
  card_design?: string | null
  card_design_back?: string | null
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
  username?: string | null
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

  // Active Tab state
  const [activeTab, setActiveTab] = useState<'users' | 'units'>('users')

  // Unit Modal states
  const [showCreateUnit, setShowCreateUnit] = useState(false)
  const [editUnit, setEditUnit] = useState<Unit | null>(null)
  const [deleteUnitTarget, setDeleteUnitTarget] = useState<Unit | null>(null)

  // Unit Search query
  const [unitSearchQuery, setUnitSearchQuery] = useState('')

  // Unit image upload states (base64)
  const [frontDesignBase64, setFrontDesignBase64] = useState<string | null>(null)
  const [backDesignBase64, setBackDesignBase64] = useState<string | null>(null)

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

  // Handle unit design image upload & base64 conversion
  const handleImageUpload = (file: File, type: 'front' | 'back') => {
    if (!file.type.startsWith('image/')) {
      setError('File harus berupa gambar (JPG/PNG).')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran file terlalu besar. Maksimal 5MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (type === 'front') {
        setFrontDesignBase64(reader.result as string)
      } else {
        setBackDesignBase64(reader.result as string)
      }
    }
    reader.onerror = () => {
      setError('Gagal membaca file gambar.')
    }
    reader.readAsDataURL(file)
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

  // ── CREATE Unit ──────────────────────────────────────────────────
  const handleCreateUnit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    if (frontDesignBase64) formData.append('card_design', frontDesignBase64)
    if (backDesignBase64) formData.append('card_design_back', backDesignBase64)

    const result = await createUnitAction(formData)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setShowCreateUnit(false)
      setFrontDesignBase64(null)
      setBackDesignBase64(null)
      setLoading(false)
      showSuccess('Unit baru berhasil ditambahkan!')
      startTransition(() => router.refresh())
    }
  }

  // ── UPDATE Unit ──────────────────────────────────────────────────
  const handleUpdateUnit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    
    if (frontDesignBase64) {
      formData.append('card_design', frontDesignBase64)
    } else if (frontDesignBase64 === 'REMOVE') {
      formData.append('card_design', 'REMOVE')
    }

    if (backDesignBase64) {
      formData.append('card_design_back', backDesignBase64)
    } else if (backDesignBase64 === 'REMOVE') {
      formData.append('card_design_back', 'REMOVE')
    }

    const result = await updateUnitAction(formData)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setEditUnit(null)
      setFrontDesignBase64(null)
      setBackDesignBase64(null)
      setLoading(false)
      showSuccess('Unit berhasil diperbarui!')
      startTransition(() => router.refresh())
    }
  }

  // ── DELETE Unit ──────────────────────────────────────────────────
  const handleDeleteUnit = async () => {
    if (!deleteUnitTarget) return
    setError(null)
    setLoading(true)

    const result = await deleteUnitAction(deleteUnitTarget.id)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setDeleteUnitTarget(null)
      setLoading(false)
      showSuccess('Unit berhasil dihapus!')
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

  // Filtered units calculation
  const filteredUnits = units.filter((unit) => {
    const searchLower = unitSearchQuery.toLowerCase().trim()
    return searchLower === '' || unit.nama.toLowerCase().includes(searchLower)
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
      <div className="flex gap-2 mb-6 border-b border-slate-200 pb-2.5">
        <button
          onClick={() => { setActiveTab('users'); setError(null) }}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'users'
              ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
              : 'text-slate-500 hover:text-slate-800 bg-white border border-slate-200/60'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          Kelola User
        </button>
        <button
          onClick={() => { setActiveTab('units'); setError(null) }}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'units'
              ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
              : 'text-slate-500 hover:text-slate-800 bg-white border border-slate-200/60'
          }`}
        >
          <Folder className="w-3.5 h-3.5" />
          Kelola Unit & Desain
        </button>
      </div>

      {activeTab === 'users' ? (
        /* Users Table */
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
                              {usr.username || (usr.email && usr.email.endsWith('@idcard.local')
                                ? usr.email.split('@')[0]
                                : (usr.email || usr.user_id))}
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
                                className="p-1.5 text-slate-400 hover:text-indigo-650 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                                title="Edit user"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => { setDeleteTarget(usr); setError(null) }}
                                className="p-1.5 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition cursor-pointer"
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
      ) : (
        /* Units Table Card */
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden mb-8">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Daftar Unit & Desain Kartu</h3>
            <button
              onClick={() => { setShowCreateUnit(true); setError(null); setFrontDesignBase64(null); setBackDesignBase64(null); }}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-sm shadow-indigo-100 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Unit
            </button>
          </div>

          {/* Unit Search Bar */}
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Cari unit berdasarkan nama..."
                value={unitSearchQuery}
                onChange={(e) => setUnitSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs text-slate-900 transition outline-none"
              />
            </div>
          </div>

          <div className="p-6">
            {filteredUnits.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-mono">
                Tidak ada unit yang cocok dengan pencarian.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredUnits.map((unit) => {
                  const userCount = users.filter(u => getUnitId(u.units) === unit.id).length;
                  return (
                    <div key={unit.id} className="border border-slate-200/80 rounded-2xl p-5 hover:shadow-md transition flex flex-col justify-between bg-slate-50/30">
                      <div>
                        {/* Title and stats */}
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{unit.nama}</h4>
                            <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-1">
                              <User className="w-3 h-3 text-slate-400" />
                              {userCount} User Aktif
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { setEditUnit(unit); setError(null); setFrontDesignBase64(null); setBackDesignBase64(null); }}
                              className="p-1.5 text-slate-400 hover:text-indigo-650 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                              title="Edit unit & desain"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => { setDeleteUnitTarget(unit); setError(null); }}
                              className="p-1.5 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition cursor-pointer"
                              title="Hapus unit"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Previews */}
                        <div className="grid grid-cols-2 gap-3 mt-2 border-t border-slate-100 pt-3">
                          <div className="flex flex-col items-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Desain Depan</span>
                            <div className="w-full aspect-[3.2/5] max-w-[110px] rounded-xl border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center relative group">
                              {unit.card_design ? (
                                <>
                                  <img src={unit.card_design} alt="Front Template" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                    <a href={unit.card_design} target="_blank" rel="noopener noreferrer" className="p-1 bg-white rounded-lg text-slate-800 hover:scale-105 transition">
                                      <Eye className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                </>
                              ) : (
                                <div className="text-center p-3 text-slate-400">
                                  <FileImage className="w-6 h-6 mx-auto mb-1 opacity-60" />
                                  <span className="text-[8px] font-mono uppercase tracking-wider">Default</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Desain Belakang</span>
                            <div className="w-full aspect-[3.2/5] max-w-[110px] rounded-xl border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center relative group">
                              {unit.card_design_back ? (
                                <>
                                  <img src={unit.card_design_back} alt="Back Template" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                    <a href={unit.card_design_back} target="_blank" rel="noopener noreferrer" className="p-1 bg-white rounded-lg text-slate-800 hover:scale-105 transition">
                                      <Eye className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                </>
                              ) : (
                                <div className="text-center p-3 text-slate-400">
                                  <FileImage className="w-6 h-6 mx-auto mb-1 opacity-60" />
                                  <span className="text-[8px] font-mono uppercase tracking-wider">Default</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

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
              {/* Username */}
              <div className="space-y-1.5">
                <label htmlFor="create-username" className="text-[10px] font-semibold text-slate-700 uppercase tracking-wider block">
                  Username <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input type="text" id="create-username" name="username" required placeholder="Contoh: igi_user, john, dll"
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
                <div className="text-xs font-semibold text-slate-800">{editUser.name || editUser.username || (editUser.email && editUser.email.endsWith('@idcard.local') ? editUser.email.split('@')[0] : editUser.email) || '—'}</div>
                <div className="text-[10px] font-mono text-slate-400">{editUser.username || (editUser.email && editUser.email.endsWith('@idcard.local') ? editUser.email.split('@')[0] : (editUser.email || editUser.user_id))}</div>
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

              {/* Username */}
              <div className="space-y-1.5">
                <label htmlFor="edit-username" className="text-[10px] font-semibold text-slate-700 uppercase tracking-wider block">
                  Username <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input 
                    type="text" 
                    id="edit-username" 
                    name="username" 
                    required 
                    defaultValue={editUser.username || (editUser.email && editUser.email.endsWith('@idcard.local') ? editUser.email.split('@')[0] : editUser.email) || ''} 
                    placeholder="igi_user, john, dll"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs text-slate-900 transition outline-none" 
                  />
                </div>
              </div>

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
                User <span className="font-semibold text-slate-700">{deleteTarget.name || deleteTarget.username || (deleteTarget.email && deleteTarget.email.endsWith('@idcard.local') ? deleteTarget.email.split('@')[0] : deleteTarget.email) || deleteTarget.user_id}</span> akan
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
      {/* ── CREATE UNIT MODAL ─────────────────────────────────────────── */}
      {showCreateUnit && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => !loading && setShowCreateUnit(false)}>
          <div className="w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center border border-indigo-100">
                  <Folder className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Tambah Unit Baru</h3>
              </div>
              <button onClick={() => setShowCreateUnit(false)} disabled={loading} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition cursor-pointer disabled:opacity-50">
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200/60 rounded-xl text-red-700 flex gap-2 items-start text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateUnit} className="space-y-4">
              {/* Nama Unit */}
              <div className="space-y-1.5">
                <label htmlFor="unit-nama" className="text-[10px] font-semibold text-slate-700 uppercase tracking-wider block">
                  Nama Unit / Perusahaan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="unit-nama"
                  name="nama"
                  required
                  placeholder="Contoh: PT IGI, Unit IT, Yayasan"
                  className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs text-slate-900 transition outline-none"
                />
              </div>

              {/* Upload Desain Depan */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-700 uppercase tracking-wider block">
                  Desain Template Depan <span className="text-slate-400 lowercase font-normal">(PNG/JPG, rasio 320x500 px)</span>
                </label>
                
                {frontDesignBase64 ? (
                  <div className="flex items-center gap-3 p-3 border border-indigo-100 bg-indigo-50/30 rounded-xl">
                    <div className="w-10 aspect-[3.2/5] border border-slate-200 rounded overflow-hidden">
                      <img src={frontDesignBase64} alt="Front Preview" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-grow text-[10px] font-medium text-slate-600 truncate">Template Depan Terunggah</div>
                    <button
                      type="button"
                      onClick={() => setFrontDesignBase64(null)}
                      className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-red-650 transition cursor-pointer"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-slate-100/50 transition cursor-pointer">
                    <Upload className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-[10px] font-semibold text-slate-600">Klik untuk upload Desain Depan</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, 'front');
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Upload Desain Belakang */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-700 uppercase tracking-wider block">
                  Desain Template Belakang <span className="text-slate-400 lowercase font-normal">(PNG/JPG, rasio 320x500 px)</span>
                </label>
                
                {backDesignBase64 ? (
                  <div className="flex items-center gap-3 p-3 border border-indigo-100 bg-indigo-50/30 rounded-xl">
                    <div className="w-10 aspect-[3.2/5] border border-slate-200 rounded overflow-hidden">
                      <img src={backDesignBase64} alt="Back Preview" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-grow text-[10px] font-medium text-slate-600 truncate">Template Belakang Terunggah</div>
                    <button
                      type="button"
                      onClick={() => setBackDesignBase64(null)}
                      className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-red-650 transition cursor-pointer"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-slate-100/50 transition cursor-pointer">
                    <Upload className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-[10px] font-semibold text-slate-600">Klik untuk upload Desain Belakang</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, 'back');
                      }}
                    />
                  </label>
                )}
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/50 rounded-xl text-[9px] text-slate-500 leading-normal">
                💡 <strong>Tips Layout:</strong> Pastikan template desain memiliki proporsi area pas foto di bagian tengah atas, agar sesuai dengan struktur cetak otomatis YKBS.
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2.5 pt-2">
                <button type="button" onClick={() => setShowCreateUnit(false)} disabled={loading}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer disabled:opacity-50">
                  Batal
                </button>
                <button type="submit" disabled={loading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50">
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {loading ? 'Menyimpan...' : 'Simpan Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT UNIT MODAL ───────────────────────────────────────────── */}
      {editUnit && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => !loading && setEditUnit(null)}>
          <div className="w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center border border-indigo-100">
                  <Pencil className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Edit Unit & Desain</h3>
              </div>
              <button onClick={() => setEditUnit(null)} disabled={loading} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition cursor-pointer disabled:opacity-50">
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200/60 rounded-xl text-red-700 flex gap-2 items-start text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleUpdateUnit} className="space-y-4">
              <input type="hidden" name="id" value={editUnit.id} />

              {/* Nama Unit */}
              <div className="space-y-1.5">
                <label htmlFor="edit-unit-nama" className="text-[10px] font-semibold text-slate-700 uppercase tracking-wider block">
                  Nama Unit / Perusahaan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="edit-unit-nama"
                  name="nama"
                  required
                  defaultValue={editUnit.nama}
                  placeholder="Contoh: PT IGI"
                  className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs text-slate-900 transition outline-none"
                />
              </div>

              {/* Desain Depan */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-700 uppercase tracking-wider block">
                  Desain Template Depan
                </label>

                {frontDesignBase64 === 'REMOVE' ? (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-[10px] text-red-750 font-semibold flex items-center justify-between">
                    <span>Desain akan dihapus (kembali ke bawaan)</span>
                    <button type="button" onClick={() => setFrontDesignBase64(null)} className="text-[10px] text-slate-500 underline cursor-pointer">Batal</button>
                  </div>
                ) : frontDesignBase64 ? (
                  <div className="flex items-center gap-3 p-3 border border-indigo-100 bg-indigo-50/30 rounded-xl">
                    <div className="w-10 aspect-[3.2/5] border border-slate-200 rounded overflow-hidden">
                      <img src={frontDesignBase64} alt="New Front Preview" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-grow text-[10px] font-medium text-indigo-700 truncate">Desain Baru Terpilih</div>
                    <button type="button" onClick={() => setFrontDesignBase64(null)} className="p-1 text-slate-500 hover:text-red-650 transition cursor-pointer">
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                ) : editUnit.card_design ? (
                  <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl bg-slate-50/50">
                    <div className="w-10 aspect-[3.2/5] border border-slate-200 rounded overflow-hidden">
                      <img src={editUnit.card_design} alt="Current Front" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-grow text-[10px] font-medium text-slate-600 truncate">Desain Depan Saat Ini</div>
                    <div className="flex gap-2">
                      <label className="text-[10px] font-semibold text-indigo-650 hover:underline cursor-pointer">
                        Ganti
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file, 'front');
                          }}
                        />
                      </label>
                      <button type="button" onClick={() => setFrontDesignBase64('REMOVE')} className="text-[10px] font-semibold text-red-600 hover:underline cursor-pointer">Hapus</button>
                    </div>
                  </div>
                ) : (
                  <label className="border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-slate-100/50 transition cursor-pointer">
                    <Upload className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-[10px] font-semibold text-slate-600">Klik untuk upload Desain Depan</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, 'front');
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Desain Belakang */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-700 uppercase tracking-wider block">
                  Desain Template Belakang
                </label>

                {backDesignBase64 === 'REMOVE' ? (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-[10px] text-red-750 font-semibold flex items-center justify-between">
                    <span>Desain akan dihapus (kembali ke bawaan)</span>
                    <button type="button" onClick={() => setBackDesignBase64(null)} className="text-[10px] text-slate-500 underline cursor-pointer">Batal</button>
                  </div>
                ) : backDesignBase64 ? (
                  <div className="flex items-center gap-3 p-3 border border-indigo-100 bg-indigo-50/30 rounded-xl">
                    <div className="w-10 aspect-[3.2/5] border border-slate-200 rounded overflow-hidden">
                      <img src={backDesignBase64} alt="New Back Preview" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-grow text-[10px] font-medium text-indigo-700 truncate">Desain Baru Terpilih</div>
                    <button type="button" onClick={() => setBackDesignBase64(null)} className="p-1 text-slate-500 hover:text-red-650 transition cursor-pointer">
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                ) : editUnit.card_design_back ? (
                  <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl bg-slate-50/50">
                    <div className="w-10 aspect-[3.2/5] border border-slate-200 rounded overflow-hidden">
                      <img src={editUnit.card_design_back} alt="Current Back" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-grow text-[10px] font-medium text-slate-600 truncate">Desain Belakang Saat Ini</div>
                    <div className="flex gap-2">
                      <label className="text-[10px] font-semibold text-indigo-650 hover:underline cursor-pointer">
                        Ganti
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file, 'back');
                          }}
                        />
                      </label>
                      <button type="button" onClick={() => setBackDesignBase64('REMOVE')} className="text-[10px] font-semibold text-red-600 hover:underline cursor-pointer">Hapus</button>
                    </div>
                  </div>
                ) : (
                  <label className="border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-slate-100/50 transition cursor-pointer">
                    <Upload className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-[10px] font-semibold text-slate-600">Klik untuk upload Desain Belakang</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, 'back');
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2.5 pt-2">
                <button type="button" onClick={() => setEditUnit(null)} disabled={loading}
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

      {/* ── DELETE UNIT MODAL ─────────────────────────────────────────── */}
      {deleteUnitTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => !loading && setDeleteUnitTarget(null)}>
          <div className="w-full max-w-sm bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 relative" onClick={e => e.stopPropagation()}>
            {/* Warning icon */}
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-3 border border-red-100">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Hapus Unit?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Unit <span className="font-semibold text-slate-700">{deleteUnitTarget.nama}</span> akan
                dihapus secara permanen dari database. Tindakan ini tidak bisa dibatalkan.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200/60 rounded-xl text-red-700 flex gap-2 items-start text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-2.5">
              <button onClick={() => setDeleteUnitTarget(null)} disabled={loading}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer disabled:opacity-50">
                Batal
              </button>
              <button onClick={handleDeleteUnit} disabled={loading}
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
