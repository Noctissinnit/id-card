'use client'

import React, { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Pencil, Trash2, X, UserPlus, Save,
  AlertTriangle, CheckCircle2, Loader2, Mail,
  Lock, User, Users, Building, Search, SlidersHorizontal,
  Upload, FileImage, Folder, Eye, Trash,
  LayoutDashboard, Shield, Menu, LogOut, ShieldAlert, Move
} from 'lucide-react'
import { signOutAction } from '../auth-actions'
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
  layout_config?: any | null
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
  stats: {
    totalUsers: number
    totalAdmins: number
    totalIT: number
    totalYayasan: number
  }
  adminUsername: string
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
export default function AdminUserManager({ users, units, stats, adminUsername }: AdminUserManagerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Local copy of units that syncs with props but can also be updated locally after save
  const [localUnits, setLocalUnits] = useState<Unit[]>(units)
  useEffect(() => {
    setLocalUnits(units)
  }, [units])

  // Modal states
  const [showCreate, setShowCreate] = useState(false)
  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null)

  // Active Tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'units'>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)

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

  // Layout Configuration Modal States (supporting 2D horizontal & vertical coordinates)
  const [modalLayout, setModalLayout] = useState({
    jabatan_top: '26.5',
    jabatan_left: '5',
    nik_top: '35',
    nik_left: '0',
    nama_top: '86',
    nama_left: '5',
    photo_top: '43',
    photo_left: '26.5',
    photo_width: '150',
    photo_height: '200',
    photo_shape: 'rectangle',
    text_color: '#000000',
    jabatan_color: '#000000',
    nik_color: '#000000',
    nama_color: '#000000',
    show_jabatan: true,
    show_nik: true,
    show_nama: true,
    show_photo: true
  })

  const getLayoutObject = (unit: any) => {
    if (!unit || !unit.layout_config) return null
    if (typeof unit.layout_config === 'string') {
      try {
        return JSON.parse(unit.layout_config)
      } catch {
        return null
      }
    }
    return unit.layout_config
  }

  useEffect(() => {
    if (editUnit) {
      const config = getLayoutObject(editUnit)
      setModalLayout({
        jabatan_top: config?.jabatan_top || '26.5',
        jabatan_left: config?.jabatan_left || '5',
        nik_top: config?.nik_top || '35',
        nik_left: config?.nik_left || '0',
        nama_top: config?.nama_top || '86',
        nama_left: config?.nama_left || '5',
        photo_top: config?.photo_top || '43',
        photo_left: config?.photo_left || '26.5',
        photo_width: config?.photo_width || '150',
        photo_height: config?.photo_height || '200',
        photo_shape: config?.photo_shape || 'rectangle',
        text_color: config?.text_color || '#000000',
        jabatan_color: config?.jabatan_color || config?.text_color || '#000000',
        nik_color: config?.nik_color || config?.text_color || '#000000',
        nama_color: config?.nama_color || config?.text_color || '#000000',
        show_jabatan: config?.show_jabatan !== undefined ? !!config.show_jabatan : true,
        show_nik: config?.show_nik !== undefined ? !!config.show_nik : true,
        show_nama: config?.show_nama !== undefined ? !!config.show_nama : true,
        show_photo: config?.show_photo !== undefined ? !!config.show_photo : true
      })
    } else {
      setModalLayout({
        jabatan_top: '26.5',
        jabatan_left: '5',
        nik_top: '35',
        nik_left: '0',
        nama_top: '86',
        nama_left: '5',
        photo_top: '43',
        photo_left: '26.5',
        photo_width: '150',
        photo_height: '200',
        photo_shape: 'rectangle',
        text_color: '#000000',
        jabatan_color: '#000000',
        nik_color: '#000000',
        nama_color: '#000000',
        show_jabatan: true,
        show_nik: true,
        show_nama: true,
        show_photo: true
      })
    }
  }, [editUnit, showCreateUnit])

  // Visual drag-and-drop editor states (with click offsets for smooth dragging)
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const [activeDragElement, setActiveDragElement] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  const handleDragStart = (e: React.MouseEvent, element: string) => {
    e.preventDefault()
    if (!previewContainerRef.current) return
    
    const rect = previewContainerRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Get current position in percentage
    const curLeftPct = parseFloat((modalLayout as any)[`${element}_left`] !== undefined ? (modalLayout as any)[`${element}_left`] : '0')
    const curTopPct = parseFloat((modalLayout as any)[`${element}_top`] !== undefined ? (modalLayout as any)[`${element}_top`] : '0')

    // Convert current percentage to pixels on the canvas
    const curLeftPx = (curLeftPct / 100) * rect.width
    const curTopPx = (curTopPct / 100) * rect.height

    setDragOffset({
      x: mouseX - curLeftPx,
      y: mouseY - curTopPx
    })
    setActiveDragElement(element)
  }

  const handleDragMove = (e: React.MouseEvent) => {
    if (!activeDragElement || !previewContainerRef.current) return
    
    const rect = previewContainerRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Calculate new position
    const newLeftPx = mouseX - dragOffset.x
    const newTopPx = mouseY - dragOffset.y

    // Element dimensions (for clamping)
    const elementWidth = activeDragElement === 'photo' ? (Number(modalLayout.photo_width) * 0.75) : 216 // 90% of 240px
    const elementHeight = activeDragElement === 'photo' ? (Number(modalLayout.photo_height) * 0.75) : (activeDragElement === 'nama' ? 35 : 24)

    // Clamp values (allowing half width bleed off edge for freedom)
    const clampedX = Math.max(-elementWidth / 2, Math.min(newLeftPx, rect.width - elementWidth / 2))
    const clampedY = Math.max(-elementHeight / 2, Math.min(newTopPx, rect.height - elementHeight / 2))

    const percentX = (clampedX / rect.width) * 100
    const percentY = (clampedY / rect.height) * 100

    setModalLayout(prev => ({
      ...prev,
      [`${activeDragElement}_left`]: percentX.toFixed(1),
      [`${activeDragElement}_top`]: percentY.toFixed(1)
    }))
  }

  const handleDragEnd = () => {
    setActiveDragElement(null)
  }

  const handleTouchStart = (e: React.TouchEvent, element: string) => {
    if (!previewContainerRef.current || e.touches.length === 0) return
    
    const rect = previewContainerRef.current.getBoundingClientRect()
    const mouseX = e.touches[0].clientX - rect.left
    const mouseY = e.touches[0].clientY - rect.top

    const curLeftPct = parseFloat((modalLayout as any)[`${element}_left`] !== undefined ? (modalLayout as any)[`${element}_left`] : '0')
    const curTopPct = parseFloat((modalLayout as any)[`${element}_top`] !== undefined ? (modalLayout as any)[`${element}_top`] : '0')

    const curLeftPx = (curLeftPct / 100) * rect.width
    const curTopPx = (curTopPct / 100) * rect.height

    setDragOffset({
      x: mouseX - curLeftPx,
      y: mouseY - curTopPx
    })
    setActiveDragElement(element)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!activeDragElement || !previewContainerRef.current || e.touches.length === 0) return
    
    const rect = previewContainerRef.current.getBoundingClientRect()
    const mouseX = e.touches[0].clientX - rect.left
    const mouseY = e.touches[0].clientY - rect.top

    const newLeftPx = mouseX - dragOffset.x
    const newTopPx = mouseY - dragOffset.y

    const elementWidth = activeDragElement === 'photo' ? (Number(modalLayout.photo_width) * 0.75) : 216
    const elementHeight = activeDragElement === 'photo' ? (Number(modalLayout.photo_height) * 0.75) : (activeDragElement === 'nama' ? 35 : 24)

    const clampedX = Math.max(-elementWidth / 2, Math.min(newLeftPx, rect.width - elementWidth / 2))
    const clampedY = Math.max(-elementHeight / 2, Math.min(newTopPx, rect.height - elementHeight / 2))

    const percentX = (clampedX / rect.width) * 100
    const percentY = (clampedY / rect.height) * 100

    setModalLayout(prev => ({
      ...prev,
      [`${activeDragElement}_left`]: percentX.toFixed(1),
      [`${activeDragElement}_top`]: percentY.toFixed(1)
    }))
  }

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
      // Update localUnits with the newly created unit
      if (result.unit) {
        setLocalUnits(prev => [...prev, result.unit])
      }
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
      // Update localUnits immediately with saved layout_config so it's available on next modal open
      if (result.unit) {
        setLocalUnits(prev => prev.map(u => u.id === result.unit.id ? { ...u, ...result.unit } : u))
      } else if (editUnit) {
        // Fallback: update localUnits with the current modal layout state
        setLocalUnits(prev => prev.map(u => u.id === editUnit.id ? { ...u, layout_config: modalLayout } : u))
      }
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
      // Remove from localUnits immediately
      setLocalUnits(prev => prev.filter(u => u.id !== deleteUnitTarget.id))
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
  const filteredUnits = localUnits.filter((unit) => {
    const searchLower = unitSearchQuery.toLowerCase().trim()
    return searchLower === '' || unit.nama.toLowerCase().includes(searchLower)
  })

  return (
    <>
      <div className="min-h-screen w-full bg-slate-50 text-slate-900 flex relative overflow-hidden font-sans">
      {/* Success Toast */}
      {success && (
        <div className="fixed top-6 right-6 z-[60] bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-right">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          {success}
        </div>
      )}

      {/* ── SIDEBAR (DESKTOP & MOBILE DRAWER) ─────────────────────────────── */}
      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside 
        className={`fixed top-0 bottom-0 left-0 z-40 w-[260px] bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col justify-between transition-transform duration-300 ease-in-out md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center border border-indigo-500 shadow-lg shadow-indigo-500/30">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-tight">YKBS SECURE</h1>
              <p className="text-[10px] text-slate-400 font-mono tracking-wider">ADMIN CORE</p>
            </div>
          </div>
        </div>

        {/* Sidebar Nav links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <button
            onClick={() => { setActiveTab('overview'); setSidebarOpen(false); setError(null) }}
            className={`w-full px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 transition cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-4.5 h-4.5" />
            <span>Dashboard Overview</span>
          </button>
          
          <button
            onClick={() => { setActiveTab('users'); setSidebarOpen(false); setError(null) }}
            className={`w-full px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 transition cursor-pointer ${
              activeTab === 'users'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            <User className="w-4.5 h-4.5" />
            <span>Kelola User</span>
          </button>

          <button
            onClick={() => { setActiveTab('units'); setSidebarOpen(false); setError(null) }}
            className={`w-full px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 transition cursor-pointer ${
              activeTab === 'units'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            <Building className="w-4.5 h-4.5" />
            <span>Kelola Unit & Desain</span>
          </button>
        </nav>

        {/* Sidebar Footer (Profile info & Log Out) */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/30 flex flex-col gap-3">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center font-bold text-xs text-indigo-400 uppercase">
              {adminUsername.slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate leading-tight">{adminUsername}</p>
              <p className="text-[9px] text-slate-500 font-medium">Administrator</p>
            </div>
          </div>

          <button
            onClick={async () => {
              await signOutAction()
              router.refresh()
            }}
            className="w-full px-3 py-2 border border-slate-800 hover:border-slate-700 bg-slate-900/50 hover:bg-slate-800/40 text-slate-400 hover:text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN WORKSPACE CONTENT ───────────────────────────────────────── */}
      <main className="flex-1 md:pl-[260px] min-h-screen flex flex-col justify-between overflow-x-hidden relative">
        {/* Dynamic decorative backdrop glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-indigo-200/10 rounded-full filter blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-purple-200/10 rounded-full filter blur-[100px] pointer-events-none" />

        {/* Header bar */}
        <header className="sticky top-0 bg-white/70 backdrop-blur-md border-b border-slate-200/80 px-6 py-4 flex items-center justify-between z-30">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 md:hidden cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                {activeTab === 'overview' && 'Dashboard Overview'}
                {activeTab === 'users' && 'User Management'}
                {activeTab === 'units' && 'Unit & Design Templates'}
              </h2>
              <p className="text-[10px] text-slate-500 hidden sm:block">
                Portal Pengelolaan ID Card Digital • YKBS System
              </p>
            </div>
          </div>
          
          <div className="text-xs text-slate-500 font-semibold bg-white px-3 py-1.5 rounded-xl border border-slate-200/60 shadow-sm hidden sm:block">
            Welcome back, <span className="text-indigo-600 font-bold">{adminUsername}</span>
          </div>
        </header>

        {/* Content Workspace Area */}
        <div className="p-6 md:p-8 flex-grow z-10">
          
          {/* ── OVERVIEW VIEW ───────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* Top Banner */}
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
                <div className="relative z-10 max-w-xl">
                  <h3 className="text-xl md:text-2xl font-bold mb-2">Sistem Management ID Card</h3>
                  <p className="text-slate-300 text-xs md:text-sm leading-relaxed mb-4">
                    Selamat datang di YKBS Secure Core. Sebagai administrator, Anda memiliki kontrol penuh untuk mendaftarkan user baru, mengelompokkan mereka ke unit bisnis, serta mengunggah/mengatur template desain kartu custom yang unik untuk setiap unit.
                  </p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setActiveTab('users')}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-indigo-600/30 cursor-pointer"
                    >
                      Kelola User
                    </button>
                    <button 
                      onClick={() => setActiveTab('units')}
                      className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                    >
                      Kelola Unit
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm hover:shadow-md transition">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Users</span>
                    <Users className="w-4.5 h-4.5 text-indigo-500" />
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900">{stats.totalUsers}</div>
                  <p className="text-[10px] text-slate-400 mt-1">Terdaftar di database portal</p>
                </div>

                <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm hover:shadow-md transition">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Admins</span>
                    <Shield className="w-4.5 h-4.5 text-amber-500" />
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900">{stats.totalAdmins}</div>
                  <p className="text-[10px] text-slate-400 mt-1">Hak akses administrator</p>
                </div>

                <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm hover:shadow-md transition">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Unit IT</span>
                    <Building className="w-4.5 h-4.5 text-cyan-500" />
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900">{stats.totalIT}</div>
                  <p className="text-[10px] text-slate-400 mt-1">Anggota departemen IT</p>
                </div>

                <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm hover:shadow-md transition">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Unit Yayasan</span>
                    <Building className="w-4.5 h-4.5 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900">{stats.totalYayasan}</div>
                  <p className="text-[10px] text-slate-400 mt-1">Anggota departemen Yayasan</p>
                </div>
              </div>

              {/* Quick Info / Guidelines */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-indigo-500" />
                    Panduan Pengelolaan User
                  </h4>
                  <ul className="space-y-3 text-xs text-slate-600">
                    <li className="flex gap-2">
                      <span className="text-indigo-500 font-bold">•</span>
                      <span>Untuk login user biasa, validasi menggunakan <strong>Username</strong> dan <strong>Password</strong> (bukan email).</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-indigo-500 font-bold">•</span>
                      <span>Admin dapat mengubah username user kapan saja melalui tombol edit di tab <strong>Kelola User</strong>.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-indigo-500 font-bold">•</span>
                      <span>Setiap user baru yang ditambahkan akan dikunci temanya secara otomatis jika unitnya memiliki template desain khusus.</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Building className="w-4 h-4 text-indigo-500" />
                    Panduan Template Kustom
                  </h4>
                  <ul className="space-y-3 text-xs text-slate-600">
                    <li className="flex gap-2">
                      <span className="text-indigo-500 font-bold">•</span>
                      <span>Unggah desain depan & belakang kartu beresolusi 3:5 portrait di menu <strong>Kelola Unit & Desain</strong>.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-indigo-500 font-bold">•</span>
                      <span>Desain unit kustom (seperti PT ATMI SOLO) akan merender nama, NIK, jabatan, dan foto persegi secara otomatis di area cetak template.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-indigo-500 font-bold">•</span>
                      <span>Gunakan fitur download PDF / Gambar di portal user untuk mencetak kartu.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
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
                  {localUnits.map((u) => (
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
      )}

      {activeTab === 'units' && (
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

        </div> {/* Closes Content Workspace Area */}
        
        {/* Footer disclaimer */}
        <footer className="w-full border-t border-slate-200 bg-white py-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left z-20">
          <div className="text-[9px] text-slate-400 font-mono max-w-md leading-relaxed">
            Admin Area. Segala aktivitas diotorisasi dan dicatat untuk audit internal YKBS Security.
          </div>
          <div className="flex items-center gap-2 text-[9px] text-slate-500 font-mono bg-white px-3 py-1 border border-slate-200 rounded-lg shadow-sm">
            <ShieldAlert className="w-3 h-3 text-amber-500" />
            <span>YKBS SECURE CORE</span>
          </div>
        </footer>
      </main>
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
                    {localUnits.map(u => (
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
                    {localUnits.map(u => (
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
          <div className="w-full max-w-3xl bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Left Column: Visual Editor (Interactive Card) */}
                <div className="md:col-span-5 flex flex-col items-center justify-start space-y-4 border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 md:pr-4">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Visual Editor (Drag & Drop Y-Axis)
                  </div>
                  
                  {/* Interactive Card Canvas */}
                  <div 
                    ref={previewContainerRef}
                    onMouseMove={handleDragMove}
                    onMouseUp={handleDragEnd}
                    onMouseLeave={handleDragEnd}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleDragEnd}
                    className="w-[240px] h-[375px] border border-slate-300 rounded-xl relative overflow-hidden bg-slate-100 shadow-inner select-none cursor-default"
                  >
                    {/* Background template preview */}
                    {frontDesignBase64 ? (
                      <img 
                        src={frontDesignBase64} 
                        alt="Front Design" 
                        className="absolute inset-0 w-full h-full object-fill pointer-events-none"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-slate-100 flex flex-col items-center justify-center text-slate-400 p-4 text-center pointer-events-none">
                        <FileImage className="w-8 h-8 mb-1.5 opacity-60" />
                        <span className="text-[10px] font-semibold leading-normal">Belum ada gambar template depan</span>
                      </div>
                    )}

                    {/* Jabatan Drag Over */}
                    {modalLayout.show_jabatan && (
                      <div
                        onMouseDown={(e) => handleDragStart(e, 'jabatan')}
                        onTouchStart={(e) => handleTouchStart(e, 'jabatan')}
                        style={{
                          position: 'absolute',
                          top: `${modalLayout.jabatan_top}%`,
                          left: `${modalLayout.jabatan_left}%`,
                          width: '216px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'move',
                          zIndex: 20
                        }}
                        className="group border border-transparent hover:border-dashed hover:border-indigo-500 hover:bg-indigo-500/10 rounded transition"
                        title="Geser Jabatan (Klik & Drag Bebas)"
                      >
                        <span
                          style={{
                            fontFamily: 'sans-serif',
                            fontWeight: '900',
                            fontSize: '11px',
                            color: modalLayout.jabatan_color,
                            letterSpacing: '0.5px'
                          }}
                          className="truncate pointer-events-none"
                        >
                          JABATAN
                        </span>
                        <Move className="w-3 h-3 text-indigo-500 absolute right-1 opacity-0 group-hover:opacity-100 transition pointer-events-none" />
                      </div>
                    )}

                    {/* NIK Drag Over */}
                    {modalLayout.show_nik && (
                      <div
                        onMouseDown={(e) => handleDragStart(e, 'nik')}
                        onTouchStart={(e) => handleTouchStart(e, 'nik')}
                        style={{
                          position: 'absolute',
                          top: `${modalLayout.nik_top}%`,
                          left: `${modalLayout.nik_left}%`,
                          width: '216px',
                          height: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'move',
                          zIndex: 20
                        }}
                        className="group border border-transparent hover:border-dashed hover:border-indigo-500 hover:bg-indigo-500/10 rounded transition"
                        title="Geser NIK (Klik & Drag Bebas)"
                      >
                        <span
                          style={{
                            fontFamily: 'sans-serif',
                            fontWeight: '900',
                            fontSize: '10px',
                            color: modalLayout.nik_color,
                            letterSpacing: '0.5px'
                          }}
                          className="pointer-events-none"
                        >
                          123/45/67
                        </span>
                        <Move className="w-3 h-3 text-indigo-500 absolute right-1 opacity-0 group-hover:opacity-100 transition pointer-events-none" />
                      </div>
                    )}

                    {/* Photo Drag Over */}
                    {modalLayout.show_photo && (
                      <div
                        onMouseDown={(e) => handleDragStart(e, 'photo')}
                        onTouchStart={(e) => handleTouchStart(e, 'photo')}
                        style={{
                          position: 'absolute',
                          top: `${modalLayout.photo_top}%`,
                          left: `${modalLayout.photo_left}%`,
                          width: `${Number(modalLayout.photo_width) * 0.75}px`,
                          height: `${Number(modalLayout.photo_height) * 0.75}px`,
                          borderRadius: modalLayout.photo_shape === 'circle' ? '50%' : (modalLayout.photo_shape === 'square' ? '8px' : '0px'),
                          border: modalLayout.photo_shape === 'circle' ? '2px solid white' : (modalLayout.photo_shape === 'square' ? '2px solid white' : '1px dashed transparent'),
                          boxShadow: modalLayout.photo_shape === 'circle' ? '0 2px 6px rgba(0,0,0,0.15)' : (modalLayout.photo_shape === 'square' ? '0 2px 6px rgba(0,0,0,0.15)' : 'none'),
                          cursor: 'move',
                          zIndex: 20,
                          overflow: 'hidden'
                        }}
                        className="group hover:border-dashed hover:border-indigo-500 hover:bg-indigo-500/10 transition flex items-center justify-center bg-slate-300/80"
                        title="Geser Foto (Klik & Drag Bebas)"
                      >
                        <span className="text-[8px] font-bold text-slate-500 pointer-events-none">FOTO ({modalLayout.photo_width}x{modalLayout.photo_height})</span>
                        <Move className="w-4 h-4 text-indigo-650 absolute opacity-0 group-hover:opacity-100 transition pointer-events-none" />
                      </div>
                    )}

                    {/* Name Drag Over */}
                    {modalLayout.show_nama && (
                      <div
                        onMouseDown={(e) => handleDragStart(e, 'nama')}
                        onTouchStart={(e) => handleTouchStart(e, 'nama')}
                        style={{
                          position: 'absolute',
                          top: `${modalLayout.nama_top}%`,
                          left: `${modalLayout.nama_left}%`,
                          width: '216px',
                          height: '35px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'move',
                          zIndex: 20
                        }}
                        className="group border border-transparent hover:border-dashed hover:border-indigo-500 hover:bg-indigo-500/10 rounded transition"
                        title="Geser Nama (Klik & Drag Bebas)"
                      >
                        <span
                          style={{
                            fontFamily: 'sans-serif',
                            fontWeight: '900',
                            fontSize: '13px',
                            color: modalLayout.nama_color,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            lineHeight: '1.2',
                            textAlign: 'center',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                          }}
                          className="truncate pointer-events-none"
                        >
                          NAMA KARYAWAN
                        </span>
                        <Move className="w-3 h-3 text-indigo-500 absolute right-1 opacity-0 group-hover:opacity-100 transition pointer-events-none" />
                      </div>
                    )}
                  </div>
                  <div className="text-[9px] text-slate-400 font-medium text-center leading-normal max-w-[220px]">
                    💡 <strong>Tips Editor:</strong> Arahkan mouse ke Jabatan, NIK, Foto, atau Nama pada kartu di atas, lalu **klik & seret (drag & drop)** secara bebas ke segala arah!
                  </div>
                </div>

                {/* Right Column: Controls */}
                <div className="md:col-span-7 space-y-4">
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

              {/* ── KONFIGURASI TATA LETAK ─────────────────────────────────── */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4">
                <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 mb-2">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Tata Letak & Warna Teks</h4>
                </div>

                {/* Komponen Visibility Toggles */}
                <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                  <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">Tampilkan Komponen</span>
                  <div className="flex flex-wrap gap-4 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                      <input type="checkbox" checked={modalLayout.show_jabatan}
                        onChange={e => setModalLayout(prev => ({ ...prev, show_jabatan: e.target.checked }))}
                        className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 w-4 h-4 cursor-pointer" />
                      Jabatan
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                      <input type="checkbox" checked={modalLayout.show_nik}
                        onChange={e => setModalLayout(prev => ({ ...prev, show_nik: e.target.checked }))}
                        className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 w-4 h-4 cursor-pointer" />
                      NIK
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                      <input type="checkbox" checked={modalLayout.show_nama}
                        onChange={e => setModalLayout(prev => ({ ...prev, show_nama: e.target.checked }))}
                        className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 w-4 h-4 cursor-pointer" />
                      Nama
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                      <input type="checkbox" checked={modalLayout.show_photo}
                        onChange={e => setModalLayout(prev => ({ ...prev, show_photo: e.target.checked }))}
                        className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 w-4 h-4 cursor-pointer" />
                      Foto
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  {/* Jabatan Y & X */}
                  {modalLayout.show_jabatan && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-600 uppercase block">Jabatan Y (Tinggi: {modalLayout.jabatan_top}%)</label>
                        <input type="range" min="0" max="100" step="0.5" value={modalLayout.jabatan_top}
                          onChange={e => setModalLayout(prev => ({ ...prev, jabatan_top: e.target.value }))}
                          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-600 uppercase block">Jabatan X (Samping: {modalLayout.jabatan_left}%)</label>
                        <input type="range" min="-50" max="150" step="0.5" value={modalLayout.jabatan_left}
                          onChange={e => setModalLayout(prev => ({ ...prev, jabatan_left: e.target.value }))}
                          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                      </div>
                    </>
                  )}

                  {/* NIK Y & X */}
                  {modalLayout.show_nik && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-600 uppercase block">NIK Y (Tinggi: {modalLayout.nik_top}%)</label>
                        <input type="range" min="0" max="100" step="0.5" value={modalLayout.nik_top}
                          onChange={e => setModalLayout(prev => ({ ...prev, nik_top: e.target.value }))}
                          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-600 uppercase block">NIK X (Samping: {modalLayout.nik_left}%)</label>
                        <input type="range" min="-50" max="150" step="0.5" value={modalLayout.nik_left}
                          onChange={e => setModalLayout(prev => ({ ...prev, nik_left: e.target.value }))}
                          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                      </div>
                    </>
                  )}

                  {/* Nama Y & X */}
                  {modalLayout.show_nama && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-600 uppercase block">Nama Y (Tinggi: {modalLayout.nama_top}%)</label>
                        <input type="range" min="0" max="100" step="0.5" value={modalLayout.nama_top}
                          onChange={e => setModalLayout(prev => ({ ...prev, nama_top: e.target.value }))}
                          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-600 uppercase block">Nama X (Samping: {modalLayout.nama_left}%)</label>
                        <input type="range" min="-50" max="150" step="0.5" value={modalLayout.nama_left}
                          onChange={e => setModalLayout(prev => ({ ...prev, nama_left: e.target.value }))}
                          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                      </div>
                    </>
                  )}

                  {/* Photo Y & X */}
                  {modalLayout.show_photo && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-600 uppercase block">Foto Y (Tinggi: {modalLayout.photo_top}%)</label>
                        <input type="range" min="0" max="100" step="0.5" value={modalLayout.photo_top}
                          onChange={e => setModalLayout(prev => ({ ...prev, photo_top: e.target.value }))}
                          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-600 uppercase block">Foto X (Samping: {modalLayout.photo_left}%)</label>
                        <input type="range" min="-50" max="150" step="0.5" value={modalLayout.photo_left}
                          onChange={e => setModalLayout(prev => ({ ...prev, photo_left: e.target.value }))}
                          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                      </div>
                    </>
                  )}

                  {/* Photo Shape & Size */}
                  {modalLayout.show_photo && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-600 uppercase block">Bentuk Foto</label>
                        <select value={modalLayout.photo_shape}
                          onChange={e => {
                            const shape = e.target.value;
                            setModalLayout(prev => {
                              const updates: any = { ...prev, photo_shape: shape };
                              if (shape === 'square' || shape === 'circle') {
                                updates.photo_height = prev.photo_width;
                              }
                              return updates;
                            });
                          }}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none cursor-pointer">
                          <option value="rectangle">Persegi Panjang (3:4)</option>
                          <option value="square">Persegi / Kotak (1:1)</option>
                          <option value="circle">Bulat / Lingkaran</option>
                        </select>
                      </div>

                      {modalLayout.photo_shape === 'rectangle' ? (
                        <>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-600 uppercase block">Lebar Foto ({modalLayout.photo_width}px)</label>
                            <input type="range" min="40" max="300" step="1" value={modalLayout.photo_width}
                              onChange={e => setModalLayout(prev => ({ ...prev, photo_width: e.target.value }))}
                              className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-600 uppercase block">Tinggi Foto ({modalLayout.photo_height}px)</label>
                            <input type="range" min="40" max="300" step="1" value={modalLayout.photo_height}
                              onChange={e => setModalLayout(prev => ({ ...prev, photo_height: e.target.value }))}
                              className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                          </div>
                        </>
                      ) : (
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-600 uppercase block">Ukuran Foto ({modalLayout.photo_width}px)</label>
                          <input type="range" min="40" max="300" step="1" value={modalLayout.photo_width}
                            onChange={e => setModalLayout(prev => ({ ...prev, photo_width: e.target.value, photo_height: e.target.value }))}
                            className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                        </div>
                      )}
                    </>
                  )}

                  {/* Text Color Configurator */}
                  <div className="col-span-2 border-t border-slate-200 pt-3 mt-1.5 grid grid-cols-3 gap-3">
                    {/* Warna Jabatan */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-600 uppercase block">Warna Jabatan</label>
                      <div className="flex gap-1.5 items-center">
                        <input type="color" value={modalLayout.jabatan_color}
                          onChange={e => setModalLayout(prev => ({ ...prev, jabatan_color: e.target.value }))}
                          className="w-7 h-6 bg-transparent border-0 cursor-pointer p-0" />
                        <input type="text" value={modalLayout.jabatan_color}
                          onChange={e => setModalLayout(prev => ({ ...prev, jabatan_color: e.target.value }))}
                          className="w-full px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] outline-none font-mono uppercase" />
                      </div>
                    </div>

                    {/* Warna NIK */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-600 uppercase block">Warna NIK</label>
                      <div className="flex gap-1.5 items-center">
                        <input type="color" value={modalLayout.nik_color}
                          onChange={e => setModalLayout(prev => ({ ...prev, nik_color: e.target.value }))}
                          className="w-7 h-6 bg-transparent border-0 cursor-pointer p-0" />
                        <input type="text" value={modalLayout.nik_color}
                          onChange={e => setModalLayout(prev => ({ ...prev, nik_color: e.target.value }))}
                          className="w-full px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] outline-none font-mono uppercase" />
                      </div>
                    </div>

                    {/* Warna Nama */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-600 uppercase block">Warna Nama</label>
                      <div className="flex gap-1.5 items-center">
                        <input type="color" value={modalLayout.nama_color}
                          onChange={e => setModalLayout(prev => ({ ...prev, nama_color: e.target.value }))}
                          className="w-7 h-6 bg-transparent border-0 cursor-pointer p-0" />
                        <input type="text" value={modalLayout.nama_color}
                          onChange={e => setModalLayout(prev => ({ ...prev, nama_color: e.target.value }))}
                          className="w-full px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] outline-none font-mono uppercase" />
                      </div>
                    </div>
                  </div>
                </div>

                <input type="hidden" name="layout_config" value={JSON.stringify(modalLayout)} />
              </div>

                </div>
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
          <div className="w-full max-w-3xl bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Left Column: Visual Editor (Interactive Card) */}
                <div className="md:col-span-5 flex flex-col items-center justify-start space-y-4 border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 md:pr-4">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Visual Editor (Drag & Drop Y-Axis)
                  </div>
                  
                  {/* Interactive Card Canvas */}
                  <div 
                    ref={previewContainerRef}
                    onMouseMove={handleDragMove}
                    onMouseUp={handleDragEnd}
                    onMouseLeave={handleDragEnd}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleDragEnd}
                    className="w-[240px] h-[375px] border border-slate-300 rounded-xl relative overflow-hidden bg-slate-100 shadow-inner select-none cursor-default"
                  >
                    {/* Background template preview */}
                    {frontDesignBase64 === 'REMOVE' ? (
                      <div className="absolute inset-0 bg-slate-100 flex flex-col items-center justify-center text-slate-400 p-4 text-center pointer-events-none">
                        <FileImage className="w-8 h-8 mb-1.5 opacity-60" />
                        <span className="text-[10px] font-semibold leading-normal">Menggunakan template bawaan</span>
                      </div>
                    ) : (frontDesignBase64 || editUnit.card_design) ? (
                      <img 
                        src={frontDesignBase64 || editUnit.card_design || undefined} 
                        alt="Front Design" 
                        className="absolute inset-0 w-full h-full object-fill pointer-events-none"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-slate-100 flex flex-col items-center justify-center text-slate-400 p-4 text-center pointer-events-none">
                        <FileImage className="w-8 h-8 mb-1.5 opacity-60" />
                        <span className="text-[10px] font-semibold leading-normal">Belum ada gambar template depan</span>
                      </div>
                    )}

                    {/* Jabatan Drag Over */}
                    {modalLayout.show_jabatan && (
                      <div
                        onMouseDown={(e) => handleDragStart(e, 'jabatan')}
                        onTouchStart={(e) => handleTouchStart(e, 'jabatan')}
                        style={{
                          position: 'absolute',
                          top: `${modalLayout.jabatan_top}%`,
                          left: `${modalLayout.jabatan_left}%`,
                          width: '216px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'move',
                          zIndex: 20
                        }}
                        className="group border border-transparent hover:border-dashed hover:border-indigo-500 hover:bg-indigo-500/10 rounded transition"
                        title="Geser Jabatan (Klik & Drag Bebas)"
                      >
                        <span
                          style={{
                            fontFamily: 'sans-serif',
                            fontWeight: '900',
                            fontSize: '11px',
                            color: modalLayout.jabatan_color,
                            letterSpacing: '0.5px'
                          }}
                          className="truncate pointer-events-none"
                        >
                          JABATAN
                        </span>
                        <Move className="w-3 h-3 text-indigo-500 absolute right-1 opacity-0 group-hover:opacity-100 transition pointer-events-none" />
                      </div>
                    )}

                    {/* NIK Drag Over */}
                    {modalLayout.show_nik && (
                      <div
                        onMouseDown={(e) => handleDragStart(e, 'nik')}
                        onTouchStart={(e) => handleTouchStart(e, 'nik')}
                        style={{
                          position: 'absolute',
                          top: `${modalLayout.nik_top}%`,
                          left: `${modalLayout.nik_left}%`,
                          width: '216px',
                          height: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'move',
                          zIndex: 20
                        }}
                        className="group border border-transparent hover:border-dashed hover:border-indigo-500 hover:bg-indigo-500/10 rounded transition"
                        title="Geser NIK (Klik & Drag Bebas)"
                      >
                        <span
                          style={{
                            fontFamily: 'sans-serif',
                            fontWeight: '900',
                            fontSize: '10px',
                            color: modalLayout.nik_color,
                            letterSpacing: '0.5px'
                          }}
                          className="pointer-events-none"
                        >
                          123/45/67
                        </span>
                        <Move className="w-3 h-3 text-indigo-500 absolute right-1 opacity-0 group-hover:opacity-100 transition pointer-events-none" />
                      </div>
                    )}

                    {/* Photo Drag Over */}
                    {modalLayout.show_photo && (
                      <div
                        onMouseDown={(e) => handleDragStart(e, 'photo')}
                        onTouchStart={(e) => handleTouchStart(e, 'photo')}
                        style={{
                          position: 'absolute',
                          top: `${modalLayout.photo_top}%`,
                          left: `${modalLayout.photo_left}%`,
                          width: `${Number(modalLayout.photo_width) * 0.75}px`,
                          height: `${Number(modalLayout.photo_height) * 0.75}px`,
                          borderRadius: modalLayout.photo_shape === 'circle' ? '50%' : (modalLayout.photo_shape === 'square' ? '8px' : '0px'),
                          border: modalLayout.photo_shape === 'circle' ? '2px solid white' : (modalLayout.photo_shape === 'square' ? '2px solid white' : '1px dashed transparent'),
                          boxShadow: modalLayout.photo_shape === 'circle' ? '0 2px 6px rgba(0,0,0,0.15)' : (modalLayout.photo_shape === 'square' ? '0 2px 6px rgba(0,0,0,0.15)' : 'none'),
                          cursor: 'move',
                          zIndex: 20,
                          overflow: 'hidden'
                        }}
                        className="group hover:border-dashed hover:border-indigo-500 hover:bg-indigo-500/10 transition flex items-center justify-center bg-slate-300/80"
                        title="Geser Foto (Klik & Drag Bebas)"
                      >
                        <span className="text-[8px] font-bold text-slate-500 pointer-events-none">FOTO ({modalLayout.photo_width}x{modalLayout.photo_height})</span>
                        <Move className="w-4 h-4 text-indigo-650 absolute opacity-0 group-hover:opacity-100 transition pointer-events-none" />
                      </div>
                    )}

                    {/* Name Drag Over */}
                    {modalLayout.show_nama && (
                      <div
                        onMouseDown={(e) => handleDragStart(e, 'nama')}
                        onTouchStart={(e) => handleTouchStart(e, 'nama')}
                        style={{
                          position: 'absolute',
                          top: `${modalLayout.nama_top}%`,
                          left: `${modalLayout.nama_left}%`,
                          width: '216px',
                          height: '35px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'move',
                          zIndex: 20
                        }}
                        className="group border border-transparent hover:border-dashed hover:border-indigo-500 hover:bg-indigo-500/10 rounded transition"
                        title="Geser Nama (Klik & Drag Bebas)"
                      >
                        <span
                          style={{
                            fontFamily: 'sans-serif',
                            fontWeight: '900',
                            fontSize: '13px',
                            color: modalLayout.nama_color,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            lineHeight: '1.2',
                            textAlign: 'center',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                          }}
                          className="truncate pointer-events-none"
                        >
                          NAMA KARYAWAN
                        </span>
                        <Move className="w-3 h-3 text-indigo-500 absolute right-1 opacity-0 group-hover:opacity-100 transition pointer-events-none" />
                      </div>
                    )}
                  </div>
                  <div className="text-[9px] text-slate-400 font-medium text-center leading-normal max-w-[220px]">
                    💡 <strong>Tips Editor:</strong> Arahkan mouse ke Jabatan, NIK, Foto, atau Nama pada kartu di atas, lalu **klik & seret (drag & drop)** secara bebas ke segala arah!
                  </div>
                </div>

                {/* Right Column: Controls */}
                <div className="md:col-span-7 space-y-4">
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

              {/* ── KONFIGURASI TATA LETAK ─────────────────────────────────── */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4">
                <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 mb-2">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Tata Letak & Warna Teks</h4>
                </div>

                {/* Komponen Visibility Toggles */}
                <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                  <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">Tampilkan Komponen</span>
                  <div className="flex flex-wrap gap-4 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                      <input type="checkbox" checked={modalLayout.show_jabatan}
                        onChange={e => setModalLayout(prev => ({ ...prev, show_jabatan: e.target.checked }))}
                        className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 w-4 h-4 cursor-pointer" />
                      Jabatan
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                      <input type="checkbox" checked={modalLayout.show_nik}
                        onChange={e => setModalLayout(prev => ({ ...prev, show_nik: e.target.checked }))}
                        className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 w-4 h-4 cursor-pointer" />
                      NIK
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                      <input type="checkbox" checked={modalLayout.show_nama}
                        onChange={e => setModalLayout(prev => ({ ...prev, show_nama: e.target.checked }))}
                        className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 w-4 h-4 cursor-pointer" />
                      Nama
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                      <input type="checkbox" checked={modalLayout.show_photo}
                        onChange={e => setModalLayout(prev => ({ ...prev, show_photo: e.target.checked }))}
                        className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 w-4 h-4 cursor-pointer" />
                      Foto
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  {/* Jabatan Y & X */}
                  {modalLayout.show_jabatan && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-600 uppercase block">Jabatan Y (Tinggi: {modalLayout.jabatan_top}%)</label>
                        <input type="range" min="0" max="100" step="0.5" value={modalLayout.jabatan_top}
                          onChange={e => setModalLayout(prev => ({ ...prev, jabatan_top: e.target.value }))}
                          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-600 uppercase block">Jabatan X (Samping: {modalLayout.jabatan_left}%)</label>
                        <input type="range" min="-50" max="150" step="0.5" value={modalLayout.jabatan_left}
                          onChange={e => setModalLayout(prev => ({ ...prev, jabatan_left: e.target.value }))}
                          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                      </div>
                    </>
                  )}

                  {/* NIK Y & X */}
                  {modalLayout.show_nik && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-600 uppercase block">NIK Y (Tinggi: {modalLayout.nik_top}%)</label>
                        <input type="range" min="0" max="100" step="0.5" value={modalLayout.nik_top}
                          onChange={e => setModalLayout(prev => ({ ...prev, nik_top: e.target.value }))}
                          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-600 uppercase block">NIK X (Samping: {modalLayout.nik_left}%)</label>
                        <input type="range" min="-50" max="150" step="0.5" value={modalLayout.nik_left}
                          onChange={e => setModalLayout(prev => ({ ...prev, nik_left: e.target.value }))}
                          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                      </div>
                    </>
                  )}

                  {/* Nama Y & X */}
                  {modalLayout.show_nama && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-600 uppercase block">Nama Y (Tinggi: {modalLayout.nama_top}%)</label>
                        <input type="range" min="0" max="100" step="0.5" value={modalLayout.nama_top}
                          onChange={e => setModalLayout(prev => ({ ...prev, nama_top: e.target.value }))}
                          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-600 uppercase block">Nama X (Samping: {modalLayout.nama_left}%)</label>
                        <input type="range" min="-50" max="150" step="0.5" value={modalLayout.nama_left}
                          onChange={e => setModalLayout(prev => ({ ...prev, nama_left: e.target.value }))}
                          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                      </div>
                    </>
                  )}

                  {/* Photo Y & X */}
                  {modalLayout.show_photo && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-600 uppercase block">Foto Y (Tinggi: {modalLayout.photo_top}%)</label>
                        <input type="range" min="0" max="100" step="0.5" value={modalLayout.photo_top}
                          onChange={e => setModalLayout(prev => ({ ...prev, photo_top: e.target.value }))}
                          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-600 uppercase block">Foto X (Samping: {modalLayout.photo_left}%)</label>
                        <input type="range" min="-50" max="150" step="0.5" value={modalLayout.photo_left}
                          onChange={e => setModalLayout(prev => ({ ...prev, photo_left: e.target.value }))}
                          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                      </div>
                    </>
                  )}

                  {/* Photo Shape & Size */}
                  {modalLayout.show_photo && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-600 uppercase block">Bentuk Foto</label>
                        <select value={modalLayout.photo_shape}
                          onChange={e => {
                            const shape = e.target.value;
                            setModalLayout(prev => {
                              const updates: any = { ...prev, photo_shape: shape };
                              if (shape === 'square' || shape === 'circle') {
                                updates.photo_height = updates.photo_width = prev.photo_width;
                              }
                              return updates;
                            });
                          }}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none cursor-pointer">
                          <option value="rectangle">Persegi Panjang (3:4)</option>
                          <option value="square">Persegi / Kotak (1:1)</option>
                          <option value="circle">Bulat / Lingkaran</option>
                        </select>
                      </div>

                      {modalLayout.photo_shape === 'rectangle' ? (
                        <>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-600 uppercase block">Lebar Foto ({modalLayout.photo_width}px)</label>
                            <input type="range" min="40" max="300" step="1" value={modalLayout.photo_width}
                              onChange={e => setModalLayout(prev => ({ ...prev, photo_width: e.target.value }))}
                              className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-600 uppercase block">Tinggi Foto ({modalLayout.photo_height}px)</label>
                            <input type="range" min="40" max="300" step="1" value={modalLayout.photo_height}
                              onChange={e => setModalLayout(prev => ({ ...prev, photo_height: e.target.value }))}
                              className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-605" />
                          </div>
                        </>
                      ) : (
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-600 uppercase block">Ukuran Foto ({modalLayout.photo_width}px)</label>
                          <input type="range" min="40" max="300" step="1" value={modalLayout.photo_width}
                            onChange={e => setModalLayout(prev => ({ ...prev, photo_width: e.target.value, photo_height: e.target.value }))}
                            className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                        </div>
                      )}
                    </>
                  )}

                  {/* Text Color Configurator */}
                  <div className="col-span-2 border-t border-slate-200 pt-3 mt-1.5 grid grid-cols-3 gap-3">
                    {/* Warna Jabatan */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-600 uppercase block">Warna Jabatan</label>
                      <div className="flex gap-1.5 items-center">
                        <input type="color" value={modalLayout.jabatan_color}
                          onChange={e => setModalLayout(prev => ({ ...prev, jabatan_color: e.target.value }))}
                          className="w-7 h-6 bg-transparent border-0 cursor-pointer p-0" />
                        <input type="text" value={modalLayout.jabatan_color}
                          onChange={e => setModalLayout(prev => ({ ...prev, jabatan_color: e.target.value }))}
                          className="w-full px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] outline-none font-mono uppercase" />
                      </div>
                    </div>

                    {/* Warna NIK */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-600 uppercase block">Warna NIK</label>
                      <div className="flex gap-1.5 items-center">
                        <input type="color" value={modalLayout.nik_color}
                          onChange={e => setModalLayout(prev => ({ ...prev, nik_color: e.target.value }))}
                          className="w-7 h-6 bg-transparent border-0 cursor-pointer p-0" />
                        <input type="text" value={modalLayout.nik_color}
                          onChange={e => setModalLayout(prev => ({ ...prev, nik_color: e.target.value }))}
                          className="w-full px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] outline-none font-mono uppercase" />
                      </div>
                    </div>

                    {/* Warna Nama */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-600 uppercase block">Warna Nama</label>
                      <div className="flex gap-1.5 items-center">
                        <input type="color" value={modalLayout.nama_color}
                          onChange={e => setModalLayout(prev => ({ ...prev, nama_color: e.target.value }))}
                          className="w-7 h-6 bg-transparent border-0 cursor-pointer p-0" />
                        <input type="text" value={modalLayout.nama_color}
                          onChange={e => setModalLayout(prev => ({ ...prev, nama_color: e.target.value }))}
                          className="w-full px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] outline-none font-mono uppercase" />
                      </div>
                    </div>
                  </div>
                </div>

                <input type="hidden" name="layout_config" value={JSON.stringify(modalLayout)} />
              </div>
            </div>
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
