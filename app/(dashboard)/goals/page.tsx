export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { formatPaise } from '@/lib/money';
import { createGoalAction, contributeGoalAction, deleteGoalAction } from '@/app/actions/goals';
import { Target, Trophy, Trash2 } from 'lucide-react';

export default async function GoalsPage() {
  const goals = await prisma.goal.findMany({ orderBy: { createdAt: 'asc' } });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="max-w-2xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Savings Goals</h1>
        <p className="text-sm text-[#52525B] mt-1">Track your financial targets</p>
      </div>

      {/* Create goal form */}
      <div className="minimal-card rounded-2xl p-6">
        <p className="text-[11px] font-semibold text-[#52525B] uppercase tracking-widest mb-4">New Goal</p>
        <form action={createGoalAction} className="flex flex-col gap-3">
          <input name="name" type="text" placeholder="Goal name (e.g. Macbook, Trip to Goa)" required className="h-11 px-4 rounded-xl text-sm text-white outline-none focus:ring-1 focus:ring-white/20" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }} />
          <div className="flex gap-3">
            <input name="target" type="number" placeholder="Target amount (₹)" required className="flex-1 h-11 px-4 rounded-xl text-sm text-white outline-none focus:ring-1 focus:ring-white/20" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }} />
            <input name="targetDate" type="date" className="flex-1 h-11 px-4 rounded-xl text-sm text-white outline-none focus:ring-1 focus:ring-white/20" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }} />
          </div>
          <button type="submit" className="h-11 px-6 rounded-xl text-sm font-semibold text-black bg-white hover:bg-[#E4E4E7] transition-colors">Create Goal</button>
        </form>
      </div>

      {/* Goals list */}
      {goals.map(goal => {
        const pct = Math.min(100, Math.round((goal.currentPaise / goal.targetPaise) * 100));
        const remaining = goal.targetPaise - goal.currentPaise;
        const daysLeft = goal.targetDate ? Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
        return (
          <div key={goal.id} className="minimal-card rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: goal.isAchieved ? 'rgba(0,214,143,0.15)' : 'rgba(255,255,255,0.06)' }}>
                  {goal.isAchieved ? <Trophy size={18} style={{ color: '#00D68F' }} /> : <Target size={18} style={{ color: '#A1A1AA' }} />}
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-white">{goal.name}</p>
                  {daysLeft !== null && <p className="text-[11px] text-[#52525B]">{daysLeft > 0 ? `${daysLeft} days left` : 'Deadline passed'}</p>}
                </div>
              </div>
              <form action={deleteGoalAction.bind(null, goal.id)}>
                <button type="submit" className="text-[#52525B] hover:text-red-500 transition-colors"><Trash2 size={15} /></button>
              </form>
            </div>

            <div className="flex justify-between text-sm mb-2">
              <span className="text-white font-semibold">{formatPaise(goal.currentPaise)}</span>
              <span className="text-[#52525B]">{formatPaise(goal.targetPaise)}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden mb-1" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: goal.isAchieved ? '#00D68F' : '#A78BFA' }} />
            </div>
            <p className="text-[11px] text-[#52525B] mb-4">{pct}% complete · {goal.isAchieved ? 'Goal achieved! 🎉' : `${formatPaise(remaining)} to go`}</p>

            {!goal.isAchieved && (
              <form action={contributeGoalAction} className="flex gap-2">
                <input type="hidden" name="id" value={goal.id} />
                <input name="amount" type="number" placeholder="Add ₹ contribution" className="flex-1 h-9 px-3 rounded-lg text-sm text-white outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                <button type="submit" className="h-9 px-4 rounded-lg text-xs font-semibold" style={{ background: 'rgba(167,139,250,0.15)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.25)' }}>Add</button>
              </form>
            )}
          </div>
        );
      })}

      {goals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Target size={22} className="text-[#52525B]" />
          </div>
          <h3 className="text-white font-semibold mb-1">No goals yet</h3>
          <p className="text-[#52525B] text-sm">Create your first savings goal above</p>
        </div>
      )}
    </div>
  );
}
