'use client';
import { useState } from 'react';
import { Bell } from 'lucide-react';

export function NotificationBell({ notifications }: { notifications: any[] }) {
  const [open, setOpen] = useState(false);
  const urgent = notifications.filter(n => n.urgent).length;
  const count = notifications.length;

  if (count === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded-xl flex items-center justify-center text-[#A1A1AA] hover:text-white hover:bg-white/8 transition-colors relative"
      >
        <Bell size={18} />
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ background: urgent > 0 ? '#FF4757' : '#00D68F', color: '#000' }}>
          {count}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-72 rounded-2xl overflow-hidden" style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <p className="text-[12px] font-semibold text-[#52525B] uppercase tracking-widest">Notifications</p>
            </div>
            {notifications.map(n => (
              <div key={n.id} className="px-4 py-3 border-b hover:bg-white/3 transition-colors" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                <p className="text-[13px] font-medium text-white">{n.title}</p>
                <p className="text-[12px] text-[#52525B] mt-0.5">{n.body}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
