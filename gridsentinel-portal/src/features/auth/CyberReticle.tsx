export function CyberReticle() {
  return (
    <>
      {/* Corner bracket reticles */}
      <span className="pointer-events-none absolute -top-1 -left-1 size-3 border-t-2 border-l-2 border-primary/70" />
      <span className="pointer-events-none absolute -top-1 -right-1 size-3 border-t-2 border-r-2 border-primary/70" />
      <span className="pointer-events-none absolute -bottom-1 -left-1 size-3 border-b-2 border-l-2 border-primary/70" />
      <span className="pointer-events-none absolute -bottom-1 -right-1 size-3 border-b-2 border-r-2 border-primary/70" />

      {/* Subtle top edge scanner line */}
      <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
    </>
  );
}

