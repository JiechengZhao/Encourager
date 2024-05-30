import ChatSidebar from "../_components/ChatSidebar";
import { CurrentConversationProvider } from "../_components/CurrentConversationContext";
export default function ChartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CurrentConversationProvider>
      <div className="flex h-screen overflow-hidden">
        <ChatSidebar />
        {children}
      </div>
    </CurrentConversationProvider>
  );
}
