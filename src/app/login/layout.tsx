export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-neutral-950 z-50">
      {children}
    </div>
  );
}
