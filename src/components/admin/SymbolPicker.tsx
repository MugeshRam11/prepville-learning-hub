import { Button } from "@/components/ui/button";

interface SymbolPickerProps {
  onSelect: (symbol: string) => void;
}

const SYMBOLS = [
  { label: "Math", items: ["√", "∛", "±", "×", "÷", "≈", "≠", "≡", "∞", "∑", "∏", "∫", "∂", "∇"] },
  { label: "Compare", items: ["<", ">", "≤", "≥", "≪", "≫"] },
  { label: "Greek", items: ["α", "β", "γ", "δ", "ε", "θ", "λ", "μ", "π", "σ", "φ", "ω"] },
  { label: "Geometry", items: ["∠", "°", "⊥", "∥", "△", "◯"] },
  { label: "Fractions", items: ["½", "⅓", "¼", "¾", "⅔", "⅕", "⅛"] },
  { label: "Super", items: ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"] },
  { label: "Sub", items: ["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉"] },
];

export function SymbolPicker({ onSelect }: SymbolPickerProps) {
  return (
    <div className="space-y-3 p-4 bg-card rounded-lg border">
      <h3 className="text-sm font-semibold">Symbols</h3>
      {SYMBOLS.map((group) => (
        <div key={group.label}>
          <p className="text-xs text-muted-foreground mb-1">{group.label}</p>
          <div className="flex flex-wrap gap-1">
            {group.items.map((symbol) => (
              <Button
                key={symbol}
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => onSelect(symbol)}
              >
                {symbol}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
