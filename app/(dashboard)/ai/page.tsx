export default function AIPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }} className=" page-enter">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">AI Assistant</h1>
        <p className="text-sm text-[#6B6B6B] mt-0.5">Ask questions about your finances</p>
      </div>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#18181B]/5 border border-white/10 flex items-center justify-center mb-4 text-3xl">🤖</div>
        <h3 className="text-white font-semibold text-lg mb-2">AI Assistant</h3>
        <p className="text-[#6B6B6B] text-sm max-w-xs">
          Coming in Phase 2. Set your <code className="text-white">GEMINI_API_KEY</code> in .env.local to enable.
        </p>
      </div>
    </div>
  );
}
