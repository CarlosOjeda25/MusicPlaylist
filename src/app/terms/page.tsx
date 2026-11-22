import Link from 'next/link';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/" className="text-emerald-400 hover:text-emerald-300 text-sm inline-block">
          &larr; Volver a MusicPlaylist Radar
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Condiciones del Servicio</h1>
        <p className="text-slate-400 text-sm">Última actualización: Noviembre 2026</p>
        <section className="space-y-4 text-slate-300 leading-relaxed text-sm">
          <p>
            Bienvenido a <strong>MusicPlaylist Radar</strong>. Al utilizar nuestra aplicación web, aceptas las siguientes condiciones de uso.
          </p>
          <h2 className="text-lg font-semibold text-white pt-2">1. Propósito de la aplicación</h2>
          <p>
            MusicPlaylist Radar es una herramienta de utilidad personal que ayuda a los usuarios a explorar, comparar y sincronizar canciones entre sus listas de reproducción de Spotify y YouTube Music.
          </p>
          <h2 className="text-lg font-semibold text-white pt-2">2. Cuentas y seguridad</h2>
          <p>
            La aplicación opera utilizando los protocolos estándar de OAuth 2.0 y PKCE proporcionados por Google y Spotify. El usuario es responsable de mantener la seguridad de sus cuentas en las plataformas de origen.
          </p>
          <h2 className="text-lg font-semibold text-white pt-2">3. Exención de responsabilidad</h2>
          <p>
            El servicio se proporciona &quot;tal cual&quot; (&quot;as is&quot;), sin garantías explícitas de disponibilidad ininterrumpida. MusicPlaylist Radar no almacena copias de archivos de audio ni interactúa con contenido fuera del alcance de las APIs oficiales de Spotify y YouTube.
          </p>
        </section>
      </div>
    </main>
  );
}
