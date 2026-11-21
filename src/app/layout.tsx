import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Radar de Playlists con IA',
  description: 'Filtra y busca exclusivamente dentro de tus canciones guardadas en Spotify y YouTube Music con IA.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="bg-[#0b0d14] text-gray-100 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <header className="border-b border-gray-800 bg-[#0f121d]/80 backdrop-blur sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Link href="/" className="flex items-center space-x-3 group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                  <span className="text-xl">📡</span>
                </div>
                <div>
                  <span className="font-bold text-lg text-white tracking-tight">Radar Music</span>
                  <span className="ml-2 text-xs uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                    MVP
                  </span>
                </div>
              </Link>

              <nav className="hidden sm:flex space-x-1">
                <Link
                  href="/"
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800/60 transition"
                >
                  Conexiones & Sync
                </Link>
                <Link
                  href="/radar"
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800/60 transition flex items-center space-x-1.5"
                >
                  <span>Radar & IA</span>
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                </Link>
              </nav>
            </div>

            <div className="flex items-center space-x-3 text-xs text-gray-400">
              <span className="hidden md:inline">Regla de oro:</span>
              <span className="bg-gray-800/80 px-2.5 py-1 rounded-md text-gray-300 border border-gray-700/50">
                🔒 100% canciones de tu radar
              </span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-800/60 py-6 text-center text-xs text-gray-500">
          Radar de Playlists con IA • Monolito Web MVP • Spotify & YouTube Data API v3
        </footer>
      </body>
    </html>
  );
}
