'use client';

import React from 'react';
import { User, Building, ShieldCheck, Calendar, Phone, Mail, Globe } from 'lucide-react';

export function formatNameLines(name: string): string {
  if (!name) return '';
  const words = name.trim().split(/\s+/);
  const n = words.length;
  if (n <= 1) {
    return name;
  }
  const splitIndex = Math.floor(n / 2);
  const firstLine = words.slice(0, splitIndex).join(' ');
  const secondLine = words.slice(splitIndex).join(' ');
  return `${firstLine}\n${secondLine}`;
}

export interface IdCardData {
  nama: string;
  nik: string;
  jabatan: string;
  departemen?: string;
  photoUrl?: string;
  templateUrl?: string;
  layoutConfig?: {
    nama_color?: string;
    nik_color?: string;
    jabatan_color?: string;
    photo_shape?: 'circle' | 'square' | 'rectangle';
    photo_width?: number;
    photo_height?: number;
    photo_top?: number;
    photo_left?: number;
    nama_top?: number;
    nama_left?: number;
    nik_top?: number;
    nik_left?: number;
    jabatan_top?: number;
    jabatan_left?: number;
    jabatan_align?: 'left' | 'center' | 'right';
    nik_align?: 'left' | 'center' | 'right';
    nama_align?: 'left' | 'center' | 'right';
    photo_bg_color?: string;
    jabatan_size?: string;
    jabatan_weight?: string;
    nik_size?: string;
    nik_weight?: string;
    nama_size?: string;
    nama_weight?: string;
  };
}

interface IdCardProps {
  data: IdCardData;
  side?: 'front' | 'back';
}

export default function IdCard({ data, side = 'front' }: IdCardProps) {
  const config = data.layoutConfig || {};

  const namaColor = config.nama_color || '#ffffff';
  const nikColor = config.nik_color || '#ffffff';
  const jabatanColor = config.jabatan_color || '#facc15';

  const photoShape = config.photo_shape || 'circle';
  const photoW = config.photo_width || 249;
  const photoH = config.photo_height || 249;
  const photoTop = config.photo_top !== undefined ? `${config.photo_top}%` : '17.9%';
  const photoLeft = config.photo_left !== undefined ? `${config.photo_left}%` : '11.1%';

  const namaTop = config.nama_top !== undefined ? `${config.nama_top}%` : '69.7%';
  const namaLeft = config.nama_left !== undefined ? `${config.nama_left}%` : '5%';

  const nikTop = config.nik_top !== undefined ? `${config.nik_top}%` : '76.3%';
  const nikLeft = config.nik_left !== undefined ? `${config.nik_left}%` : '5%';

  const jabatanTop = config.jabatan_top !== undefined ? `${config.jabatan_top}%` : '26.5%';
  const jabatanLeft = config.jabatan_left !== undefined ? `${config.jabatan_left}%` : '5%';

  if (side === 'back') {
    return (
      <div
        id="id-card-back"
        className="w-[320px] h-[509px] relative overflow-hidden bg-white text-slate-800 shadow-xl shrink-0 border border-slate-200"
        style={{
          boxSizing: 'border-box'
        }}
      >
        <div className="w-full h-full bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 p-5 flex flex-col justify-between text-white relative">
          {/* Header */}
          <div className="flex justify-between items-center border-b border-indigo-500/30 pb-3 z-10">
            <span className="text-[10px] font-mono tracking-[2px] uppercase text-indigo-300 font-bold">INFO KEANGGOTAAN</span>
            <Building className="w-4 h-4 text-indigo-400" />
          </div>

          {/* Body Rules */}
          <div className="space-y-2 text-[8.5px] text-slate-300 z-10 leading-relaxed py-2">
            <p>1. Kartu identitas ini adalah milik sah unit kerja dan wajib dibawa saat bertugas.</p>
            <p>2. Apabila kartu identitas ini ditemukan, mohon untuk mengembalikan ke kantor Sekretariat.</p>
            <p>3. Dilarang menyalahgunakan kartu identitas ini untuk tindakan yang melanggar hukum.</p>
          </div>

          {/* Issuer info */}
          <div className="border-t border-indigo-500/30 pt-3 space-y-2 z-10">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <div>
                <p className="text-[7px] uppercase text-indigo-300">Masa Berlaku</p>
                <p className="text-[9px] font-mono font-bold text-white">SEUMUR HIDUP</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <div>
                <p className="text-[7px] uppercase text-indigo-300">Otoritas Penerbit</p>
                <p className="text-[9px] font-mono font-bold text-white">Yayasan Karya Bakti / ATMI</p>
              </div>
            </div>
          </div>

          {/* Footer Contact */}
          <div className="border-t border-indigo-500/30 pt-2 flex flex-col gap-1 text-[8px] text-indigo-200 font-mono z-10">
            <div className="flex items-center gap-1.5">
              <Phone className="w-3 h-3 text-indigo-400" />
              <span>+62-271-714855</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Mail className="w-3 h-3 text-indigo-400" />
              <span>info@yayasankaryabakti.org</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Globe className="w-3 h-3 text-indigo-400" />
              <span>www.yayasankaryabakti.org</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      id="id-card"
      className="w-[320px] h-[509px] relative overflow-hidden bg-white text-slate-900 shadow-xl shrink-0 border border-slate-200 select-none"
      style={{
        boxSizing: 'border-box'
      }}
    >
      {/* Background Template Graphic */}
      {data.templateUrl ? (
        <img
          src={data.templateUrl}
          alt="ID Card Template"
          crossOrigin="anonymous"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none z-0"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-700 via-indigo-900 to-slate-900 z-0" />
      )}

      {/* Jabatan */}
      <div
        style={{
          position: 'absolute',
          top: jabatanTop,
          left: jabatanLeft,
          width: '288px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: config.jabatan_align === 'left' ? 'flex-start' : (config.jabatan_align === 'right' ? 'flex-end' : 'center'),
          textAlign: config.jabatan_align || 'center',
          zIndex: 10
        }}
      >
        <span
          style={{
            fontFamily: 'sans-serif',
            fontWeight: config.jabatan_weight || '900',
            fontSize: `${(Number(config.jabatan_size || 11) / 0.75).toFixed(1)}px`,
            color: jabatanColor,
            letterSpacing: '0.5px',
            lineHeight: '1.2',
            textAlign: config.jabatan_align || 'center'
          }}
        >
          {data.jabatan || 'JABATAN'}
        </span>
      </div>

      {/* Photo Container */}
      <div
        style={{
          position: 'absolute',
          top: photoTop,
          left: photoLeft,
          width: `${photoW}px`,
          height: `${photoH}px`,
          borderRadius: photoShape === 'circle' ? '50%' : photoShape === 'square' ? '8px' : '0px',
          border: '3px solid white',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: config.photo_bg_color || '#1b365d',
          boxSizing: 'border-box',
          zIndex: 10
        }}
      >
        {data.photoUrl ? (
          <img
            src={data.photoUrl}
            alt="Profile Photo"
            crossOrigin="anonymous"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-slate-400">
            <User className="w-10 h-10" />
            <span className="text-[9px] font-sans">NO PHOTO</span>
          </div>
        )}
      </div>

      {/* Nama Karyawan */}
      <div
        style={{
          position: 'absolute',
          top: namaTop,
          left: namaLeft,
          width: '288px',
          height: '47px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: config.nama_align === 'left' ? 'flex-start' : (config.nama_align === 'right' ? 'flex-end' : 'center'),
          textAlign: config.nama_align || 'center',
          zIndex: 10
        }}
      >
        <span
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: config.nama_weight || '700',
            fontSize: `${(Number(config.nama_size || 13) / 0.75).toFixed(1)}px`,
            color: namaColor,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            lineHeight: '0.85',
            textAlign: config.nama_align || 'center',
            whiteSpace: 'pre-line'
          }}
        >
          {formatNameLines(data.nama || 'NAMA KARYAWAN')}
        </span>
      </div>

      {/* NIK */}
      <div
        style={{
          position: 'absolute',
          top: nikTop,
          left: nikLeft,
          width: '288px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: config.nik_align === 'left' ? 'flex-start' : (config.nik_align === 'right' ? 'flex-end' : 'center'),
          textAlign: config.nik_align || 'center',
          zIndex: 10
        }}
      >
        <span
          style={{
            fontFamily: "'Lato', sans-serif",
            fontWeight: config.nik_weight || '400',
            fontSize: `${(Number(config.nik_size || 10) / 0.75).toFixed(1)}px`,
            color: nikColor,
            letterSpacing: '0.5px',
            textAlign: config.nik_align || 'center'
          }}
        >
          NIK. {data.nik || '123/45/67'}
        </span>
      </div>
    </div>
  );
}
