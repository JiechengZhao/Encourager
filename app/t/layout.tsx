import TaskSideBar from "@/app/_components/TaskSideBar";
import { CurrentConversationProvider } from "@/app/_components/CurrentConversationContext";
import { TaskRecordProvider } from "@/app/_components/TaskRecordContext";

export default function ChartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CurrentConversationProvider>
      <TaskRecordProvider>
        <div className="flex h-screen overflow-hidden">
          <TaskSideBar />
          {children}
        </div>
      </TaskRecordProvider>
    </CurrentConversationProvider>
  );
}
