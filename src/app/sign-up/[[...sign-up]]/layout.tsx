export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        {children}
      </body>
    </html>
  );
} 