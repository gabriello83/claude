/**
 * Wordmark "digivend" — reproduce el logotipo corporativo (minúsculas,
 * grotesca ancha, tinta azul-noche) con la fuente Archivo en expansión.
 * Se usa como marca de empresa en el login y en la barra superior.
 */
export function LogoDigivend({ size = 28 }: { size?: number }) {
  return (
    <span
      className="logo-digivend"
      style={{ fontSize: size }}
      aria-label="digivend"
    >
      digivend
    </span>
  );
}
