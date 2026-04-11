export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-[9999]">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/wolves-bg.jpg)' }}
      />
      {/* Dark overlay — lets image show through subtly */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px]" />
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
