export const metadata = {
  title: "Worksheet Generator",
  description: "Tạo worksheet tiếng Anh theo trình độ CEFR",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
