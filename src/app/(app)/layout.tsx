import Sidebar from '@/components/ui/Sidebar'
import BottomNav from '@/components/ui/BottomNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden pb-24 md:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
