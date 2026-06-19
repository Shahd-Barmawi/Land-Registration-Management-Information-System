import "./globals.css";

export const metadata = {
  title: "LRMIS — Land Registration Management Information System",
  description: "Land Registration Management Information System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-cream text-forest-900 antialiased">
        {children}
      </body>
    </html>
  );
}
