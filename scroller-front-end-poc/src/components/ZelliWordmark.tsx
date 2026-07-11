/**
 * The "Zelli" wordmark. The raspberry accent is the tittle (dot) of the final
 * "i": the letter is rendered dotless (U+0131) and a magenta dot is positioned
 * where its tittle would sit, matching the Zelli MVP Figma logo.
 */
export default function ZelliWordmark({ className = '' }: { className?: string }) {
  return (
    <span
      className={`relative inline-flex items-start text-4xl font-bold leading-none tracking-tight text-zelli-ink ${className}`}
    >
      Zell
      <span className="relative">
        {'ı'}
        <span
          aria-hidden
          className="absolute left-[calc(50%+0.016em-0.03125px)] top-[calc(0.08em-2px)] h-[0.22em] w-[0.22em] -translate-x-1/2 rounded-full bg-zelli-primary"
        />
      </span>
    </span>
  );
}
