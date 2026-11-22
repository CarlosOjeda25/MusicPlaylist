import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/" className="text-emerald-400 hover:text-emerald-300 text-sm inline-block">
          &larr; Volver a MusicPlaylist Radar
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Política de Privacidad</h1>
        <p className="text-slate-400 text-sm">Última actualización: Noviembre 2026</p>
        <section className="space-y-4 text-slate-300 leading-relaxed text-sm">
          <p>
            <strong>MusicPlaylist Radar</strong> respeta tu privacidad y se compromete a proteger la información que compartes con nosotros.
          </p>
          <h2 className="text-lg font-semibold text-white pt-2">1. Uso de datos de Spotify y YouTube</h2>
          <p>
            Esta aplicación solicita acceso a tus cuentas de Spotify y Google (YouTube Music) exclusivamente para leer tus playlists, verificar canciones disponibles y sincronizar pistas entre ambos servicios.
          </p>
          <h2 className="text-lg font-semibold text-white pt-2">2. Almacenamiento seguro</h2>
          <p>
            Todos los tokens de acceso y refresco se almacenan cifrados con el estándar militar <strong>AES-256-GCM</strong>. Nunca compartimos, vendemos ni exponemos tus datos ni credenciales a terceros.
          </p>
          <h2 className="text-lg font-semibold text-white pt-2">3. Revocación de acceso</h2>
          <p>
            Puedes revocar el acceso a tus cuentas en cualquier momento desde los paneles de seguridad de tu cuenta de Google y de Spotify.
          </p>
        </section>
      </div>
    </main>
  );
}
