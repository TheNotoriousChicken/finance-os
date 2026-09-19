
export const dynamic = "force-dynamic";
import { requireAuth } from "@/lib/session";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { DashboardClientWrapper } from "@/components/layout/DashboardClientWrapper";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAuth();
  } catch {
    redirect("/login");
  }

  const [categories, paymentMethods] = await Promise.all([
    prisma.category.findMany({ orderBy: { displayOrder: "asc" } }),
    prisma.paymentMethod.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div style={{ minHeight: "100dvh", background: "#050505", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", flex: 1 }}>
        <Sidebar />
        
        {/* Main Content Area */}
        <main
          style={{ 
            flex: 1, 
            minHeight: "100dvh", 
            paddingBottom: "96px",
            width: "100%",
            marginLeft: "0px", /* Mobile default */
          }}
          className="lg-content-margin"
        >
          {/* Injecting a style tag to ensure the desktop margin is enforced cleanly without relying on tailwind-built.css edge cases */}
          <style dangerouslySetInnerHTML={{__html: `
            @media (min-width: 1024px) {
              .lg-content-margin {
                margin-left: 220px !important;
              }
            }
          `}} />
          
          <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px" }}>
            <DashboardClientWrapper categories={categories} paymentMethods={paymentMethods}>
              {children}
            </DashboardClientWrapper>
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
