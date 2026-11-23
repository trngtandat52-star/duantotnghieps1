import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';

export const metadata: Metadata = {
  title: 'Bảng Điều Khiển Quản Trị | Lunihome Decorative Lighting',
  description: 'Trang quản trị toàn diện hệ thống cửa hàng đèn trang trí cao cấp Lunihome',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="h-full bg-[#fffaf3]">
      <body className="min-h-full bg-[#fffaf3] text-[#2b251f] flex flex-col font-sans antialiased">
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
