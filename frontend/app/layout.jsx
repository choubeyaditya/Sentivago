import './globals.css';

export const metadata = {
  title: 'SentiVago',
  description: 'First Ai baseddestination discovery with live route, weather, hotel, restaurant, and review details of all indian tourist places.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
