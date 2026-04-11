export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 99999 }}>
      {/* Background image with black fallback */}
      <div
        className="absolute inset-0 bg-black bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/wolves-bg.jpg)' }}
      />
      {/* Dark overlay — lets image show through subtly */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px]" />
      {/* Content */}
      <div className="relative z-10 w-full">
        {children}
      </div>
    </div>
  );
}
