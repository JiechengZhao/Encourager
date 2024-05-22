import Sidebar from "./_components/sidebar";
import { CurrentConversationProvider } from "./_components/CurrentConversationContext";
export default function ChartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CurrentConversationProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        {children}
      </div>
    </CurrentConversationProvider>
  );
}
