import Sidebar from "./_components/sidebar";

export default function ChartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      {children}
    </div>
  );
}
