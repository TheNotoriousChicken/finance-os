'use client';

import { useState, useTransition } from 'react';
import { Search, Loader2, Sparkles, X } from 'lucide-react';
import { submitNaturalLanguageSearch } from '@/app/actions/search';
import { useRouter, useSearchParams } from 'next/navigation';

export function SearchBar() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [isPending, startTransition] = useTransition();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      submitNaturalLanguageSearch(query);
    });
  };

  const clearSearch = () => {
    setQuery('');
    router.push('/transactions');
  };

  const hasSearch = searchParams.get('q') || searchParams.get('merchant') || searchParams.get('category') || searchParams.get('start');

  return (
    <form onSubmit={handleSearch} className="relative w-full max-w-2xl">
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A1A1AA] group-focus-within:text-slate-200 transition-colors">
          {isPending ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask AI (e.g., 'Groceries last week' or 'Spent at Starbucks')"
          className="leading-relaxed block w-full pl-10 pr-10 py-3 bg-[#121214] border border-[#27272A] rounded-xl text-sm text-slate-200 placeholder-[#6B6B6B] focus:outline-none focus:border-[#3F3F46] focus:ring-1 focus:ring-[#3F3F46] transition-all"
        />
        {hasSearch && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#6B6B6B] hover:text-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </form>
  );
}