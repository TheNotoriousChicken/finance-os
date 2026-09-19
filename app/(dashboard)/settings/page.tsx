
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Shield, Cpu, User, DollarSign, Brain, ChevronRight } from "lucide-react";
import { formatPaise } from "@/lib/money";
import { revalidatePath } from "next/cache";

async function updateProfileAction(formData: FormData) {
  "use server";
  const displayName = formData.get("displayName") as string;
  const salary = formData.get("salary") as string;
  await prisma.userProfile.updateMany({
    data: {
      displayName: displayName || "Me",
      monthlySalaryPaise: salary ? Math.round(parseFloat(salary) * 100) : 0,
    },
  });
  revalidatePath("/settings");
}

async function updateSettingAction(formData: FormData) {
  "use server";
  const key = formData.get("key") as string;
  const value = formData.get("value") as string;
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  revalidatePath("/settings");
}

export default async function SettingsPage() {
  const [profile, settings] = await Promise.all([
    prisma.userProfile.findFirst(),
    prisma.setting.findMany(),
  ]);

  const settingMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }} className=" max-w-lg">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-br from-white via-white to-[#71717A] bg-clip-text text-transparent tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-[#6B6B6B] mt-1">App preferences and configuration</p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User size={14} /> Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <form action={updateProfileAction} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wider">Display Name</label>
              <input
                name="displayName"
                defaultValue={profile?.displayName ?? "Me"}
                className="w-full h-11 px-4 bg-[#0A0A0A] border border-[#27272A] rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-white/20"
                placeholder="Your name"
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wider">Monthly Salary (Rs.)</label>
              <input
                name="salary"
                type="number"
                step="0.01"
                defaultValue={profile ? (profile.monthlySalaryPaise / 100).toFixed(2) : ""}
                className="w-full h-11 px-4 bg-[#0A0A0A] border border-[#27272A] rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-white/20"
                placeholder="e.g. 75000"
              />
            </div>
            <button
              type="submit"
              className="w-full h-11 bg-white text-black text-sm font-semibold rounded-xl hover:bg-[#E4E4E7] transition-colors active:scale-[0.98]"
            >
              Save Profile
            </button>
          </form>
        </CardContent>
      </Card>

      {/* AI Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain size={14} /> AI Categorization Thresholds
          </CardTitle>
        </CardHeader>
        <CardContent style={{ display: "flex", flexDirection: "column", gap: "24px" }} className="p-5 pt-0 ">
          <form action={updateSettingAction} className="flex items-end gap-3">
            <input type="hidden" name="key" value="ai.confidence.high" />
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }} className="flex-1 ">
              <label className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wider">Auto-fill threshold (%)</label>
              <input
                name="value"
                type="number"
                min="0"
                max="100"
                defaultValue={settingMap["ai.confidence.high"] ?? "90"}
                className="w-full h-11 px-4 bg-[#0A0A0A] border border-[#27272A] rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-white/20"
              />
            </div>
            <button type="submit" className="h-11 px-5 bg-[#27272A] text-white text-sm font-medium rounded-xl hover:bg-[#3F3F46] transition-colors flex-shrink-0">
              Save
            </button>
          </form>
          <form action={updateSettingAction} className="flex items-end gap-3">
            <input type="hidden" name="key" value="ai.confidence.mid" />
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }} className="flex-1 ">
              <label className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wider">Suggestion threshold (%)</label>
              <input
                name="value"
                type="number"
                min="0"
                max="100"
                defaultValue={settingMap["ai.confidence.mid"] ?? "70"}
                className="w-full h-11 px-4 bg-[#0A0A0A] border border-[#27272A] rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-white/20"
              />
            </div>
            <button type="submit" className="h-11 px-5 bg-[#27272A] text-white text-sm font-medium rounded-xl hover:bg-[#3F3F46] transition-colors flex-shrink-0">
              Save
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield size={14} /> Security &amp; Privacy
          </CardTitle>
        </CardHeader>
        <CardContent style={{ display: "flex", flexDirection: "column", gap: "24px" }} className="p-5 pt-0 ">
          <div className="flex items-start gap-3 p-4 bg-[#00D68F]/5 border border-[#00D68F]/20 rounded-xl">
            <Shield size={16} className="text-[#00D68F] mt-0.5 flex-shrink-0" />
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              Transaction notes are AES-256-GCM encrypted at field level. No card numbers, CVV, PIN, or OTP are ever stored.
            </p>
          </div>
          <div className="flex items-start gap-3 p-4 bg-[#4D9EF7]/5 border border-[#4D9EF7]/20 rounded-xl">
            <Cpu size={16} className="text-[#4D9EF7] mt-0.5 flex-shrink-0" />
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              All data is stored in your cloud Supabase database. Only merchant strings and amounts are sent to the AI API for categorization.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
