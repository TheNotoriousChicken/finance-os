import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-[80vh]">
      <Loader2 size={40} className="text-[#00D68F] animate-spin mb-4" />
      <p className="text-[#52525B] text-sm tracking-widest uppercase font-semibold animate-pulse">Syncing Cloud...</p>
    </div>
  );
}
