/**
 * ReceiptDivider — garis putus-putus pemisah section, seperti sobekan struk.
 * Per §12: "garis putus-putus (dashed) sebagai 'sobekan' pemisah antar section"
 */
export function ReceiptDivider({ label }: { label?: string }) {
  if (label) {
    return (
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 border-t-2 border-dashed border-tinta/15" />
        <span className="text-xs font-mono uppercase tracking-widest text-tinta-pudar select-none">
          {label}
        </span>
        <div className="flex-1 border-t-2 border-dashed border-tinta/15" />
      </div>
    );
  }

  return (
    <div className="relative my-4 flex items-center justify-center">
      {/* Notch left */}
      <div className="absolute -left-4 w-4 h-4 rounded-full bg-[#EDE9DF]" />
      <div className="flex-1 border-t-2 border-dashed border-tinta/20 mx-1" />
      {/* Notch right */}
      <div className="absolute -right-4 w-4 h-4 rounded-full bg-[#EDE9DF]" />
    </div>
  );
}

/**
 * SectionHeader — bold uppercase label di struk
 */
export function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-xs font-mono uppercase tracking-[0.15em] text-tinta-pudar font-bold">
        {children}
      </span>
    </div>
  );
}
