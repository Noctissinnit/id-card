'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Upload, 
  User, 
  Fingerprint, 
  Briefcase, 
  Building, 
  Palette, 
  Layers, 
  AlertCircle,
  FileImage,
  ArrowRight
} from 'lucide-react';
import { saveSessionAction } from './actions';
import { savePhoto } from './db';
import IDCardCropper from './id-card-cropper';

const THEME_OPTIONS = [
  {
    id: 'karya-bakti',
    name: 'Karya Bakti',
    colors: ['from-blue-600', 'via-blue-800', 'to-zinc-100'],
    desc: 'Template resmi Yayasan Karya Bakti Surakarta dari gambar polos.',
    textClass: 'text-blue-400'
  },
  // {
  //   id: 'cyberpunk',
  //   name: 'Cyberpunk Neon',
  //   colors: ['from-pink-500', 'via-purple-500', 'to-cyan-500'],
  //   desc: 'Warna neon terang, gaya HUD masa depan, font monospaced.',
  //   textClass: 'text-pink-400'
  // },
  // {
  //   id: 'neon-emerald',
  //   name: 'Matrix Emerald',
  //   colors: ['from-emerald-600', 'via-zinc-900', 'to-black'],
  //   desc: 'Estetika konsol peretas / hacker dengan pendaran hijau emerald.',
  //   textClass: 'text-emerald-400'
  // },
  // {
  //   id: 'minimal-dark',
  //   name: 'Obsidian Dark',
  //   colors: ['from-zinc-700', 'via-zinc-800', 'to-zinc-950'],
  //   desc: 'Desain ultra-bersih, minimalis, dan sangat profesional.',
  //   textClass: 'text-zinc-300'
  // },
  // {
  //   id: 'aurora-teal',
  //   name: 'Aurora Teal',
  //   colors: ['from-teal-400', 'via-indigo-500', 'to-purple-600'],
  //   desc: 'Latar gradien aurora modern dengan kesan perusahaan teknologi tinggi.',
  //   textClass: 'text-teal-400'
  // },
  // {
  //   id: 'luxury-gold',
  //   name: 'Luxury Gold',
  //   colors: ['from-amber-600', 'via-neutral-900', 'to-black'],
  //   desc: 'Perpaduan warna emas dan hitam legam yang anggun dan berwibawa.',
  //   textClass: 'text-amber-400'
  // }
];

export default function IDCardForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fields state
  const [nama, setNama] = useState('');
  const [nik, setNik] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [departemen, setDepartemen] = useState('');
  const [theme, setTheme] = useState('karya-bakti');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validation: limit to images and size < 5MB
      if (!file.type.startsWith('image/')) {
        setError('File harus berupa gambar (JPEG/PNG).');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Ukuran gambar terlalu besar. Maksimal 5MB.');
        return;
      }

      setError(null);
      setPhoto(file);
      
      // Read file as base64 to open cropper modal
      const reader = new FileReader();
      reader.onload = () => {
        setRawImageSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!file.type.startsWith('image/')) {
        setError('File harus berupa gambar.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Ukuran gambar terlalu besar. Maksimal 5MB.');
        return;
      }
      setError(null);
      setPhoto(file);
      
      // Read file as base64 to open cropper modal
      const reader = new FileReader();
      reader.onload = () => {
        setRawImageSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!nama.trim()) return setError('Nama tidak boleh kosong.');
    if (!nik.trim()) return setError('NIK tidak boleh kosong.');
    if (nik.length < 5) return setError('NIK minimal berisi 5 karakter.');
    if (!photoBase64) return setError('Silakan unggah pas foto Anda.');

    setLoading(true);

    try {
      // Save photo to IndexedDB on the client side
      await savePhoto('id_card_photo', photoBase64);

      const formData = new FormData();
      formData.append('nama', nama);
      formData.append('nik', nik);
      formData.append('jabatan', jabatan);
      formData.append('departemen', departemen);
      formData.append('theme', theme);
      formData.append('hasPhoto', 'true');

      const result = await saveSessionAction(formData);
      
      if (result.success) {
        router.refresh();
      } else {
        setError('Gagal menyimpan data ke session. Silakan coba kembali.');
      }
    } catch (err) {
      console.error('Error submitting form:', err);
      setError('Terjadi kesalahan saat memproses formulir.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
      
      {/* Decorative Blur Background inside card (soft light mode pastels) */}
      <div className="absolute top-[-100px] left-[-100px] w-64 h-64 bg-indigo-200/30 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-100px] w-64 h-64 bg-emerald-200/20 rounded-full filter blur-3xl pointer-events-none" />

      {/* Form Header */}
      <div className="text-center sm:text-left mb-8 z-10 relative">
        <span className="text-[10px] tracking-[4px] uppercase font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-600">
          ID Card Generator
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1.5 tracking-tight">
          Buat ID Card Keanggotaan Anda
        </h2>
        <p className="text-sm text-slate-500 mt-2 max-w-xl">
          Lengkapi data diri dan unggah pas foto Anda. Seluruh data akan disimpan secara instan di dalam session browser Anda.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 text-red-700 shadow-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">{error}</div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-8 z-10 relative">
        
        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Left Column: Data fields */}
          <div className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="nama" className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4.5 h-4.5" />
                </div>
                <input
                  type="text"
                  id="nama"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: John Doe"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-sm text-slate-900 placeholder-slate-400 transition outline-none shadow-inner"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="nik" className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                Nomor Induk Karyawan (NIK) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Fingerprint className="w-4.5 h-4.5" />
                </div>
                <input
                  type="text"
                  id="nik"
                  value={nik}
                  onChange={(e) => {
                    // Allow numbers and slashes (/)
                    const val = e.target.value.replace(/[^0-9/]/g, '');
                    setNik(val);
                  }}
                  maxLength={20}
                  placeholder="Contoh: 123/23/20"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-sm text-slate-900 placeholder-slate-400 transition outline-none font-mono shadow-inner"
                  required
                />
              </div>
              <p className="text-[10px] text-slate-500 font-mono">Input berupa angka dan garis miring (/) (Maks. 20 karakter)</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="jabatan" className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                Jabatan / Posisi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Briefcase className="w-4.5 h-4.5" />
                </div>
                <input
                  type="text"
                  id="jabatan"
                  value={jabatan}
                  onChange={(e) => setJabatan(e.target.value)}
                  placeholder="Contoh: Lead Frontend Architect"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-sm text-slate-900 placeholder-slate-400 transition outline-none shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="departemen" className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                Divisi / Departemen
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Building className="w-4.5 h-4.5" />
                </div>
                <input
                  type="text"
                  id="departemen"
                  value={departemen}
                  onChange={(e) => setDepartemen(e.target.value)}
                  placeholder="Contoh: Product Engineering"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-sm text-slate-900 placeholder-slate-400 transition outline-none shadow-inner"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Photo upload */}
          <div className="space-y-2 flex flex-col h-full">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
              Pas Foto Anda <span className="text-red-500">*</span>
            </span>
            
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex-grow border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition ${
                photoPreview 
                  ? 'border-indigo-500/50 bg-indigo-50/40' 
                  : 'border-slate-300 hover:border-slate-450 bg-slate-50/50 hover:bg-slate-100/30'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoChange}
                accept="image/*"
                className="hidden"
              />

              {photoPreview ? (
                <div className="space-y-4 flex flex-col items-center">
                  <div className="relative w-28 h-28 rounded-xl overflow-hidden border border-slate-200 shadow-md">
                    <img 
                      src={photoPreview} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-indigo-650 font-semibold">
                    <FileImage className="w-4 h-4" />
                    <span className="truncate max-w-[180px]">{photo?.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 hover:underline">Klik untuk mengganti gambar</span>
                </div>
              ) : (
                <div className="space-y-3 py-6 flex flex-col items-center">
                  <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center text-slate-400 border border-slate-200 shadow-sm group-hover:scale-110 transition duration-300">
                    <Upload className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-700">Seret & lepas foto Anda di sini</p>
                    <p className="text-[10px] text-slate-500">atau klik untuk menelusuri file</p>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono">Format: JPG, PNG (Maks. 5MB)</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Theme Selector */}
        <div className="space-y-3 pt-4 border-t border-slate-250">
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block flex items-center gap-1.5">
            <Palette className="w-4.5 h-4.5 text-indigo-500" />
            Pilih Tema Desain ID Card
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
            {THEME_OPTIONS.map((opt) => {
              const isSelected = theme === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => setTheme(opt.id)}
                  className={`cursor-pointer rounded-xl p-3 border transition flex flex-col justify-between gap-2 text-left h-24 relative overflow-hidden group ${
                    isSelected 
                      ? 'border-indigo-500 bg-indigo-50/30 shadow-md shadow-indigo-500/5' 
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start z-10">
                    <span className="text-[10px] font-bold text-slate-800 tracking-tight leading-none group-hover:text-indigo-650">
                      {opt.name}
                    </span>
                    {isSelected && (
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    )}
                  </div>
                  
                  {/* Miniature Gradient Strip */}
                  <div className="flex gap-0.5 w-full h-1 rounded-full overflow-hidden mt-1.5 z-10">
                    {opt.colors.map((c, idx) => (
                      <div key={idx} className={`flex-1 bg-gradient-to-r ${c}`} />
                    ))}
                  </div>

                  <span className="text-[8px] text-slate-500 leading-tight line-clamp-2 z-10">
                    {opt.desc}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl transition duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-transparent border-t-white" />
              <span>Memproses ID Card...</span>
            </>
          ) : (
            <>
              <span>Generate ID Card Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

      </form>

      {/* Photo Crop Modal */}
      {rawImageSrc && (
        <IDCardCropper
          imageSrc={rawImageSrc}
          onCropComplete={(croppedBase64) => {
            setPhotoBase64(croppedBase64);
            setPhotoPreview(croppedBase64);
            setRawImageSrc(null);
          }}
          onCancel={() => {
            setRawImageSrc(null);
            if (!photoBase64) {
              setPhoto(null);
              setPhotoPreview(null);
            }
          }}
        />
      )}
    </div>
  );
}
