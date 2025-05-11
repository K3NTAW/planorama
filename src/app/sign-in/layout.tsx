export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      minHeight: '100vh',
      minWidth: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f9fafb',
      overflow: 'hidden',
      zIndex: 9999
    }}>
      {children}
    </div>
  );
} 