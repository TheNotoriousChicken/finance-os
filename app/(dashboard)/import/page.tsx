
'use client';
import { useState, useTransition, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { parseBulkStatementAction } from '@/app/actions/bulk-import';
import { parseFileManually } from '@/lib/manual-parser';
import { formatPaise } from '@/lib/money';
import { Upload, FileText, CheckCircle2, FileUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';

export default function BulkImportPage() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'AI' | 'MANUAL'>('AI');
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = () => {
    setError('');
    startTransition(async () => {
      try {
        if (mode === 'MANUAL' && file) {
          const res = await parseFileManually(file);
          setResults(res);
          return;
        }

        const formData = new FormData();
        if (file) formData.append('file', file);
        if (text) formData.append('text', text);
        
        const res = await parseBulkStatementAction(formData);
        setResults(res);
      } catch (e: any) {
        setError(e.message);
      }
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Bulk Import</h1>
        <p className="leading-relaxed text-sm text-[#A1A1AA] mt-1">Upload your bank statement (PDF/CSV/Excel) or paste text directly</p>
      </div>

      <Card className="border-white/10 bg-[#0A0A0A]">
        <CardContent className="p-6 space-y-6">
          
          <div className="flex bg-[#121214] p-1 rounded-xl w-max border border-white/10 mb-4">
            <button 
              onClick={() => setMode('AI')} 
              className={`px-4 py-1.5 rounded-lg text-sm font-normal transition-colors ${mode === 'AI' ? 'bg-[#27272A] text-slate-200 shadow-sm' : 'text-[#A1A1AA] hover:text-slate-200'}`}
            >
              Smart AI Import
            </button>
            <button 
              onClick={() => setMode('MANUAL')} 
              className={`px-4 py-1.5 rounded-lg text-sm font-normal transition-colors ${mode === 'MANUAL' ? 'bg-[#27272A] text-slate-200 shadow-sm' : 'text-[#A1A1AA] hover:text-slate-200'}`}
            >
              Manual Excel/CSV
            </button>
          </div>

          {/* File Upload Area */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-white/20 transition-colors bg-white/[0.02]"
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept=".pdf,.csv,.xlsx,.xls" 
            />
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4 text-[#A1A1AA]">
              {file ? <CheckCircle2 className="text-[#00D68F]" /> : <FileUp />}
            </div>
            {file ? (
              <div>
                <p className="leading-relaxed text-sm font-normal text-slate-200">{file.name}</p>
                <p className="leading-relaxed text-xs text-[#A1A1AA] mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <div>
                <p className="leading-relaxed text-sm font-normal text-slate-200">Click to upload a document</p>
                <p className="leading-relaxed text-xs text-[#A1A1AA] mt-1">PDF, CSV, or Excel format</p>
              </div>
            )}
          </div>

          {mode === 'AI' && (
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-white/10"></div>
            <span className="leading-relaxed text-xs text-[#A1A1AA] font-normal uppercase tracking-wider">OR PASTE TEXT</span>
            <div className="flex-1 h-px bg-white/10"></div>
          </div>
          )}

          {mode === 'AI' && (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Date, Narration, Ref No., Value Date, Withdrawal Amt., Deposit Amt., Closing Balance..."
              className="leading-relaxed w-full h-32 bg-[#121214] border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 text-slate-200 placeholder-[#71717A] resize-none"
              disabled={!!file}
            />
          )}
          
          {error && <div className="leading-relaxed text-red-400 text-sm font-normal bg-red-400/10 p-3 rounded-lg">{error}</div>}

          <Button 
            onClick={handleImport} 
            loading={isPending} 
            disabled={(!text.trim() && !file) || isPending}
            className="w-full"
          >
            {isPending ? (mode === 'AI' ? 'Extracting with Gemini...' : 'Parsing File...') : (mode === 'AI' ? 'Analyze with AI' : 'Parse File Locally')}
          </Button>
        </CardContent>
      </Card>

      {results && (
        <Card className="border-white/10 bg-[#0A0A0A]">
          <CardContent className="p-6">
            {saved ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 size={40} className="text-[#00D68F] mb-4" />
                <h3 className="text-slate-200 font-bold text-lg mb-2">Import Saved!</h3>
                <p className="leading-relaxed text-[#A1A1AA] text-sm">
                  {results?.length} transactions have been reviewed and saved.
                </p>
              </div>
            ) : (
              <>
            <h3 className="font-bold mb-4 text-slate-200 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-[#00D68F]" /> 
              Extracted {results.length} transactions
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {results.map((tx, i) => (
                <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-[#121214] border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="leading-relaxed w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs">
                      {tx.type === 'INCOME' ? '↓' : '↑'}
                    </div>
                    <div>
                      <div className="leading-relaxed text-sm font-normal text-slate-200">{tx.merchantNormalized}</div>
                      <div className="leading-relaxed text-xs text-[#A1A1AA]">{tx.date}</div>
                    </div>
                  </div>
                  <div className={`text-sm font-bold ${tx.type === 'INCOME' ? 'text-[#00D68F]' : 'text-slate-200'}`}>
                    {tx.type === 'INCOME' ? '+' : '-'}{formatPaise(tx.amountPaise)}
                  </div>
                </div>
              ))}
            </div>
              </>
            )}
            
            <div className="mt-6 flex gap-3">
              <Button className="flex-1" variant="outline" onClick={() => { setResults(null); setSaved(false); }}>Cancel</Button>
              <Button className="flex-1" onClick={() => setSaved(true)}>Save to Database</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
