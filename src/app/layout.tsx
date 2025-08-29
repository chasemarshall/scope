import "./globals.css";

export const metadata = { title: "Scope" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`font-sans bg-black text-neutral-200 antialiased`}>
        {children}
      </body>
    </html>
  );
}
