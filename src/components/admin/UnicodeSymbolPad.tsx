import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UnicodeSymbolPadProps {
  onSymbolClick: (symbol: string) => void;
}

const SYMBOL_CATEGORIES = {
  "Basic Math": ["√", "∛", "∜", "±", "∓", "×", "÷", "≈", "≠", "≡", "∞"],
  "Comparison": ["<", ">", "≤", "≥", "≪", "≫", "⊂", "⊃", "⊆", "⊇"],
  "Algebra": ["∑", "∏", "∫", "∬", "∭", "∮", "∂", "∇", "Δ", "δ"],
  "Geometry": ["∠", "°", "⊥", "∥", "⊿", "△", "▱", "◯", "⊙", "⌒"],
  "Greek Letters": ["α", "β", "γ", "δ", "ε", "θ", "λ", "μ", "π", "σ", "φ", "ω", "Σ", "Π", "Ω"],
  "Fractions": ["½", "⅓", "¼", "⅕", "⅙", "⅛", "⅔", "¾", "⅖", "⅗", "⅘", "⅚", "⅝", "⅞"],
  "Superscripts": ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹", "⁺", "⁻", "⁼", "⁽", "⁾", "ⁿ"],
  "Subscripts": ["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉", "₊", "₋", "₌", "₍", "₎"],
  "Units": ["°C", "°F", "°K", "cm", "m", "km", "cm²", "m²", "km²", "cm³", "m³", "km³"],
  "Arrows": ["→", "←", "↑", "↓", "↔", "⇒", "⇐", "⇔", "↗", "↘", "↖", "↙"],
  "Logic": ["∧", "∨", "¬", "⊕", "⊗", "∀", "∃", "∄", "∈", "∉", "⊂", "⊄"],
};

export function UnicodeSymbolPad({ onSymbolClick }: UnicodeSymbolPadProps) {
  return (
    <Card className="p-4 bg-background">
      <h3 className="text-sm font-semibold mb-3 text-foreground">Unicode Symbols</h3>
      <ScrollArea className="h-[500px]">
        <div className="space-y-4">
          {Object.entries(SYMBOL_CATEGORIES).map(([category, symbols]) => (
            <div key={category}>
              <h4 className="text-xs font-medium mb-2 text-muted-foreground">{category}</h4>
              <div className="grid grid-cols-6 gap-1">
                {symbols.map((symbol) => (
                  <Button
                    key={symbol}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 text-base hover:bg-primary hover:text-primary-foreground"
                    onClick={() => onSymbolClick(symbol)}
                    title={`Insert ${symbol}`}
                  >
                    {symbol}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
