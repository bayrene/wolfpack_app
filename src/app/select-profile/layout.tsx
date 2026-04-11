export default function SelectProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-neutral-950 z-[9999]">
      {children}
    </div>
  );
}
