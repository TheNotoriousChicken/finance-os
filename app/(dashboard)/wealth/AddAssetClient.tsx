'use client';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { AddAssetModal } from '@/components/wealth/AddAssetModal';

export function AddAssetClient() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-[#FAFAFA] text-black px-4 py-2 rounded-xl text-sm font-semibold hover:bg-white transition-colors"
      >
        <Plus size={16} /> Add Asset
      </button>
      <AddAssetModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
