export default function ReaderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[100dvh] overflow-hidden overscroll-none">{children}</div>
  );
}
