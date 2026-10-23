import "./globals.css";

export const metadata = {
  title: "Yazıcı Takip",
  description: "Yazıcı ve sarf malzeme takibi",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}