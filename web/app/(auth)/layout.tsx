export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-slate-100 via-white to-sky-50 p-4">
      {children}
    </div>
  );
}
