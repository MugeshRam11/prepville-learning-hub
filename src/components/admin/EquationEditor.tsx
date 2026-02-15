import React, { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, RotateCw, ChevronDown, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import copy from "copy-to-clipboard";
import katex from "katex";

interface EquationEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// ─── Toolbar dropdown data ───────────────────────────────────────
interface ToolbarGroup {
  id: string;
  label: string;
  items: { label: string; latex: string }[];
}

const TOOLBAR_GROUPS: ToolbarGroup[] = [
  {
    id: "fraction",
    label: "Fraction",
    items: [
      { label: "dy/dx", latex: "\\frac{dy}{dx}" },
      { label: "Δy/Δx", latex: "\\frac{\\Delta y}{\\Delta x}" },
      { label: "∂y/∂x", latex: "\\frac{\\partial y}{\\partial x}" },
      { label: "π/2", latex: "\\frac{\\pi}{2}" },
      { label: "x/y", latex: "\\frac{x}{y}" },
      { label: "a/b", latex: "\\frac{a}{b}" },
    ],
  },
  {
    id: "script",
    label: "Script",
    items: [
      { label: "x²", latex: "x^{2}" },
      { label: "e^{iωt}", latex: "e^{i\\omega t}" },
      { label: "x_y", latex: "x_{y}" },
      { label: "e^{-x}", latex: "e^{-x}" },
      { label: "aⁿ", latex: "a^{n}" },
    ],
  },
  {
    id: "radical",
    label: "Radical",
    items: [
      { label: "√x", latex: "\\sqrt{x}" },
      { label: "ⁿ√a", latex: "\\sqrt[n]{a}" },
      { label: "√(a²+b²)", latex: "\\sqrt{a^2+b^2}" },
    ],
  },
  {
    id: "integral",
    label: "Integral",
    items: [
      { label: "∫₋ₓˣ", latex: "\\int_{-x}^{x}" },
      { label: "∫₀^∞", latex: "\\int_{0}^{\\infty}" },
      { label: "∮", latex: "\\oint" },
    ],
  },
  {
    id: "large",
    label: "Large Op",
    items: [
      { label: "∑", latex: "\\sum_{i=0}^{n}" },
      { label: "∏", latex: "\\prod_{i=1}^{k}" },
      { label: "⋃", latex: "\\bigcup_{i}" },
    ],
  },
  {
    id: "bracket",
    label: "Bracket",
    items: [
      { label: "( )", latex: "\\left( \\right)" },
      { label: "[ ]", latex: "\\left[ \\right]" },
      { label: "{ }", latex: "\\{ \\}" },
      { label: "| |", latex: "\\left| \\right|" },
    ],
  },
  {
    id: "function",
    label: "Function",
    items: [
      { label: "sin θ", latex: "\\sin\\theta" },
      { label: "cos x", latex: "\\cos x" },
      { label: "tan⁻¹", latex: "\\tan^{-1}" },
      { label: "log₂", latex: "\\log_{2}" },
      { label: "ln x", latex: "\\ln x" },
    ],
  },
  {
    id: "limit",
    label: "Limit",
    items: [
      { label: "lim→∞", latex: "\\lim_{n \\to \\infty}" },
      { label: "lim→0", latex: "\\lim_{x \\to 0}" },
      { label: "max", latex: "\\max_{0\\leq x}" },
    ],
  },
  {
    id: "matrix",
    label: "Matrix",
    items: [
      { label: "2×2 I", latex: "\\begin{pmatrix}1&0\\\\0&1\\end{pmatrix}" },
      { label: "(a b;c d)", latex: "\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}" },
      { label: "3×3", latex: "\\begin{pmatrix}a&b&c\\\\d&e&f\\\\g&h&i\\end{pmatrix}" },
    ],
  },
];

// ─── Symbol bar ──────────────────────────────────────────────────
const SYMBOLS = [
  { label: "α", latex: "\\alpha" },
  { label: "β", latex: "\\beta" },
  { label: "γ", latex: "\\gamma" },
  { label: "δ", latex: "\\delta" },
  { label: "θ", latex: "\\theta" },
  { label: "π", latex: "\\pi" },
  { label: "∞", latex: "\\infty" },
  { label: "∂", latex: "\\partial" },
  { label: "∀", latex: "\\forall" },
  { label: "∃", latex: "\\exists" },
  { label: "≤", latex: "\\le" },
  { label: "≥", latex: "\\ge" },
  { label: "≠", latex: "\\ne" },
  { label: "±", latex: "\\pm" },
  { label: "÷", latex: "\\div" },
  { label: "×", latex: "\\times" },
  { label: "·", latex: "\\cdot" },
  { label: "→", latex: "\\to" },
];

// ─── LaTeX → Unicode converter ──────────────────────────────────
function latexToUnicode(latex: string): string {
  let s = latex;
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1)/($2)");
  s = s.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, " $1√$2 ");
  s = s.replace(/\\sqrt\{([^}]+)\}/g, "√($1)");
  s = s.replace(/\\int/g, "∫");
  s = s.replace(/\\oint/g, "∮");
  s = s.replace(/\\sum/g, "∑");
  s = s.replace(/\\prod/g, "∏");
  s = s.replace(/\\bigcup/g, "⋃");
  s = s.replace(/\\bigcap/g, "⋂");
  s = s.replace(/\\lim/g, "lim");
  s = s.replace(/\\to/g, "→");
  s = s.replace(/\\infty/g, "∞");
  s = s.replace(/\\partial/g, "∂");
  s = s.replace(/\\nabla/g, "∇");

  const greek: Record<string, string> = {
    alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", zeta: "ζ", eta: "η",
    theta: "θ", iota: "ι", kappa: "κ", lambda: "λ", mu: "μ", nu: "ν", xi: "ξ",
    pi: "π", rho: "ρ", sigma: "σ", tau: "τ", upsilon: "υ", phi: "φ",
    chi: "χ", psi: "ψ", omega: "ω",
    Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Xi: "Ξ", Pi: "Π", Sigma: "Σ",
    Phi: "Φ", Psi: "Ψ", Omega: "Ω",
  };
  for (const [cmd, ch] of Object.entries(greek)) {
    s = s.replace(new RegExp(`\\\\${cmd}\\b`, "g"), ch);
  }

  const supMap: Record<string, string> = {
    "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
    "+": "⁺", "-": "⁻", "=": "⁼", "(": "⁽", ")": "⁾",
    a: "ᵃ", b: "ᵇ", c: "ᶜ", d: "ᵈ", e: "ᵉ", f: "ᶠ", g: "ᵍ", h: "ʰ", i: "ⁱ", j: "ʲ",
    k: "ᵏ", l: "ˡ", m: "ᵐ", n: "ⁿ", o: "ᵒ", p: "ᵖ", r: "ʳ", s: "ˢ", t: "ᵗ", u: "ᵘ",
    v: "ᵛ", w: "ʷ", x: "ˣ", y: "ʸ", z: "ᶻ",
  };
  const subMap: Record<string, string> = {
    "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
    "+": "₊", "-": "₋", "=": "₌", "(": "₍", ")": "₎",
    a: "ₐ", e: "ₑ", h: "ₕ", i: "ᵢ", j: "ⱼ", k: "ₖ", l: "ₗ", m: "ₘ", n: "ₙ", o: "ₒ",
    p: "ₚ", r: "ᵣ", s: "ₛ", t: "ₜ", u: "ᵤ", v: "ᵥ", x: "ₓ",
  };
  const convert = (text: string, map: Record<string, string>) =>
    [...text].map((ch) => map[ch] || ch).join("");

  s = s.replace(/\_\{([^}]+)\}/g, (_, c) => convert(c, subMap));
  s = s.replace(/\^\{([^}]+)\}/g, (_, c) => convert(c, supMap));
  s = s.replace(/\^([a-zA-Z0-9])/g, (_, ch) => convert(ch, supMap));
  s = s.replace(/\_([a-zA-Z0-9])/g, (_, ch) => convert(ch, subMap));

  s = s.replace(/\\times/g, "×");
  s = s.replace(/\\div/g, "÷");
  s = s.replace(/\\pm/g, "±");
  s = s.replace(/\\cdot/g, "·");
  s = s.replace(/\\le/g, "≤");
  s = s.replace(/\\ge/g, "≥");
  s = s.replace(/\\ne/g, "≠");
  s = s.replace(/\\approx/g, "≈");
  s = s.replace(/\\equiv/g, "≡");
  s = s.replace(/\\forall/g, "∀");
  s = s.replace(/\\exists/g, "∃");
  s = s.replace(/\\emptyset/g, "∅");
  s = s.replace(/\\in /g, "∈");
  s = s.replace(/\\subset/g, "⊂");
  s = s.replace(/\\supset/g, "⊃");
  s = s.replace(/\\cup/g, "∪");
  s = s.replace(/\\cap/g, "∩");
  s = s.replace(/\\ldots/g, "…");
  s = s.replace(/\\sin/g, "sin");
  s = s.replace(/\\cos/g, "cos");
  s = s.replace(/\\tan/g, "tan");
  s = s.replace(/\\log/g, "log");
  s = s.replace(/\\ln/g, "ln");
  s = s.replace(/\\max/g, "max");
  s = s.replace(/\\min/g, "min");
  s = s.replace(/\\left|\\right/g, "");
  s = s.replace(/\\left/g, "");
  s = s.replace(/\\right/g, "");
  s = s.replace(/\\quad/g, "  ");
  s = s.replace(/\\,/g, " ");
  s = s.replace(/\\begin\{pmatrix\}/g, "(");
  s = s.replace(/\\end\{pmatrix\}/g, ")");
  s = s.replace(/\\\\/g, "; ");
  s = s.replace(/&/g, " ");
  s = s.replace(/[{}]/g, "");

  return s.trim();
}

// ─── Component ───────────────────────────────────────────────────
export default function EquationEditor({ value, onChange, placeholder, className }: EquationEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [unicodeText, setUnicodeText] = useState("");
  const { toast } = useToast();

  // Render KaTeX preview
  const renderPreview = useCallback(() => {
    if (!previewRef.current) return;
    try {
      katex.render(value || "", previewRef.current, {
        displayMode: true,
        throwOnError: false,
        errorColor: "#cc0000",
      });
    } catch {
      if (previewRef.current) {
        previewRef.current.innerHTML = `<span class="text-destructive text-sm">⚠️ Invalid LaTeX</span>`;
      }
    }
  }, [value]);

  useEffect(() => {
    renderPreview();
    setUnicodeText(latexToUnicode(value || ""));
  }, [value, renderPreview]);

  // Insert LaTeX at cursor position
  const insertLatex = (latex: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      onChange((value || "") + latex);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = (value || "").substring(0, start);
    const after = (value || "").substring(end);
    const newVal = before + latex + after;
    onChange(newVal);

    // Restore cursor position after React re-render
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + latex.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const toggleDropdown = (id: string) => {
    setOpenDropdown((prev) => (prev === id ? null : id));
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-toolbar-group]")) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const handleCopyUnicode = () => {
    copy(unicodeText);
    toast({ title: "Copied", description: "Unicode text copied to clipboard" });
  };

  const handleCopyLatex = () => {
    copy(value || "");
    toast({ title: "Copied", description: "LaTeX copied to clipboard" });
  };

  return (
    <div className={className}>
      <Card className="border border-border rounded-2xl overflow-hidden shadow-sm">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 bg-muted/50 border-b border-border">
            <h3 className="text-base font-semibold text-foreground">Word-like Math Editor</h3>
            <div className="flex bg-muted rounded-full p-1 gap-1">
              <button className="px-4 py-1.5 rounded-full text-sm font-semibold bg-background text-foreground shadow-sm transition-all">
                Text
              </button>
              <button className="px-4 py-1.5 rounded-full text-sm font-semibold text-muted-foreground hover:text-foreground transition-all">
                Math
              </button>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Toolbar – pill-shaped bar with dropdown groups */}
            <div className="flex flex-wrap gap-1 bg-muted/40 p-2.5 rounded-full border border-border">
              {TOOLBAR_GROUPS.map((group, gIdx) => (
                <div
                  key={group.id}
                  className="relative"
                  data-toolbar-group
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDropdown(group.id);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                      openDropdown === group.id
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                    }`}
                  >
                    {group.label}
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {/* Dropdown panel */}
                  {openDropdown === group.id && (
                    <div className="absolute top-full left-0 mt-2 bg-popover border border-border rounded-2xl shadow-lg p-4 z-50 min-w-[260px]">
                      <div className="grid grid-cols-3 gap-2">
                        {group.items.map((item) => (
                          <button
                            key={item.latex}
                            onClick={(e) => {
                              e.stopPropagation();
                              insertLatex(item.latex);
                              setOpenDropdown(null);
                            }}
                            className="bg-muted/50 border border-border rounded-xl px-2 py-2.5 text-center text-sm font-medium text-foreground hover:bg-accent hover:border-accent-foreground/20 transition-colors"
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Separator between groups */}
                  {gIdx < TOOLBAR_GROUPS.length - 1 && (
                    <div className="hidden" />
                  )}
                </div>
              ))}
            </div>

            {/* Symbol row */}
            <div className="flex flex-wrap gap-1.5 bg-muted/30 p-3 rounded-full justify-center border border-border/50">
              {SYMBOLS.map((sym) => (
                <button
                  key={sym.latex}
                  onClick={() => insertLatex(sym.latex)}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-background border border-border text-base font-medium text-foreground hover:bg-accent hover:border-accent-foreground/20 transition-colors"
                >
                  {sym.label}
                </button>
              ))}
            </div>

            {/* LaTeX input textarea */}
            <textarea
              ref={textareaRef}
              value={value || ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder || "Type LaTeX or paste it here..."}
              className="w-full min-h-[100px] p-4 font-mono text-base bg-background border-2 border-border rounded-2xl resize-y focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors text-foreground placeholder:text-muted-foreground"
            />

            {/* Rendered preview (KaTeX) */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Eye className="w-4 h-4" />
                <span className="font-medium">Rendered preview (KaTeX)</span>
              </div>
              <div
                ref={previewRef}
                className="min-h-[80px] p-5 bg-muted/20 border-2 border-dashed border-border rounded-2xl flex items-center justify-center overflow-x-auto"
              />
            </div>

            {/* Unicode output */}
            <div className="bg-muted/30 border border-border rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">
                  Unicode math (copy from here):
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyUnicode}
                  className="h-7 rounded-full text-xs gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </Button>
              </div>
              <div className="text-base text-foreground break-words" style={{ fontFamily: "'Segoe UI', 'Arial Unicode MS', sans-serif" }}>
                {unicodeText || <span className="text-muted-foreground italic">Type LaTeX above to see Unicode output</span>}
              </div>
            </div>

            {/* Action bar */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopyLatex} className="h-8 rounded-full text-xs gap-1">
                  <Copy className="w-3 h-3" />
                  Copy LaTeX
                </Button>
                <Button variant="outline" size="sm" onClick={handleCopyUnicode} className="h-8 rounded-full text-xs gap-1">
                  Copy Unicode
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                Click any template to insert LaTeX. Preview updates live.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
