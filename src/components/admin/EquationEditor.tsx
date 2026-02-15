import React, { useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import copy from "copy-to-clipboard";
import {
  insertAtCursor,
  transformSelection,
  toSuperscript,
  toSubscript,
  greekMap,
  operatorMap,
} from "@/lib/unicodeMath";

interface EquationEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// ─── Toolbar groups ─────────────────────────────────────────────
interface ToolItem {
  label: string;
  unicode: string;
  action: "insert" | "transform";
  transform?: (s: string) => string;
}

interface ToolGroup {
  name: string;
  items: ToolItem[];
}

const TOOL_GROUPS: ToolGroup[] = [
  {
    name: "Fraction",
    items: [
      { label: "a/b", unicode: "x/y", action: "insert" },
      { label: "¹⁄₂", unicode: "¹⁄₂", action: "insert" },
    ],
  },
  {
    name: "Script",
    items: [
      { label: "x²", unicode: "x²", action: "insert" },
      { label: "x₃", unicode: "x₃", action: "insert" },
      { label: "sup ↑", unicode: "", action: "transform", transform: toSuperscript },
      { label: "sub ↓", unicode: "", action: "transform", transform: toSubscript },
    ],
  },
  {
    name: "Radical",
    items: [
      { label: "√x", unicode: "√(x)", action: "insert" },
      { label: "∛x", unicode: "∛(x)", action: "insert" },
      { label: "∜x", unicode: "∜(x)", action: "insert" },
    ],
  },
  {
    name: "Integral",
    items: [
      { label: "∫", unicode: "∫", action: "insert" },
      { label: "∮", unicode: "∮", action: "insert" },
      { label: "∫ₐᵇ", unicode: "∫ₐᵇ", action: "insert" },
    ],
  },
  {
    name: "Large Op",
    items: [
      { label: "∑", unicode: "∑", action: "insert" },
      { label: "∏", unicode: "∏", action: "insert" },
      { label: "⋃", unicode: "⋃", action: "insert" },
      { label: "⋂", unicode: "⋂", action: "insert" },
    ],
  },
  {
    name: "Bracket",
    items: [
      { label: "( )", unicode: "( )", action: "insert" },
      { label: "[ ]", unicode: "[ ]", action: "insert" },
      { label: "{ }", unicode: "{ }", action: "insert" },
      { label: "⟨ ⟩", unicode: "⟨ ⟩", action: "insert" },
    ],
  },
];

const greekSymbols = Object.entries(greekMap).map(([name, char]) => ({ name, char }));
const operatorSymbols = Object.entries(operatorMap).map(([name, char]) => ({ name, char }));

// ─── Component ──────────────────────────────────────────────────
export default function EquationEditor({ value, onChange, placeholder, className }: EquationEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [openDropdown, setOpenDropdown] = React.useState<string | null>(null);
  const { toast } = useToast();

  const handleInsert = useCallback((unicode: string) => {
    const ta = textareaRef.current;
    if (ta) {
      const newVal = insertAtCursor(ta, unicode);
      onChange(newVal);
    } else {
      onChange((value || "") + unicode);
    }
  }, [value, onChange]);

  const handleTransform = useCallback((transformFn: (s: string) => string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const result = transformSelection(ta, transformFn);
    if (result !== null) {
      onChange(result);
    } else {
      toast({ title: "Select text first", description: "Highlight text to convert to superscript/subscript" });
    }
  }, [onChange, toast]);

  const handleToolClick = (item: ToolItem) => {
    if (item.action === "transform" && item.transform) {
      handleTransform(item.transform);
    } else {
      handleInsert(item.unicode);
    }
    setOpenDropdown(null);
  };

  const handleCopy = () => {
    copy(value || "");
    toast({ title: "Copied", description: "Equation copied to clipboard" });
  };

  // Close dropdown on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-toolbar-group]")) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return (
    <div className={className}>
      <Card className="border border-border rounded-2xl overflow-hidden shadow-sm">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 bg-muted/50 border-b border-border">
            <h3 className="text-base font-semibold text-foreground">Word-like Math Editor</h3>
            <Button variant="outline" size="sm" onClick={handleCopy} className="h-7 rounded-full text-xs gap-1">
              <Copy className="w-3 h-3" />
              Copy
            </Button>
          </div>

          <div className="p-5 space-y-4">
            {/* Toolbar – pill bar with dropdown groups */}
            <div className="flex flex-wrap gap-1 bg-muted/40 p-2.5 rounded-full border border-border">
              {TOOL_GROUPS.map((group) => (
                <div key={group.name} className="relative" data-toolbar-group>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdown(prev => prev === group.name ? null : group.name);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                      openDropdown === group.name
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                    }`}
                  >
                    {group.name}
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {openDropdown === group.name && (
                    <div className="absolute top-full left-0 mt-2 bg-popover border border-border rounded-2xl shadow-lg p-4 z-50 min-w-[220px]">
                      <div className="grid grid-cols-2 gap-2">
                        {group.items.map((item) => (
                          <button
                            key={item.label}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToolClick(item);
                            }}
                            className="bg-muted/50 border border-border rounded-xl px-2 py-2.5 text-center text-sm font-medium text-foreground hover:bg-accent hover:border-accent-foreground/20 transition-colors"
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Greek symbols */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground px-1">Greek</span>
              <div className="flex flex-wrap gap-1.5 bg-muted/30 p-3 rounded-full justify-center border border-border/50">
                {greekSymbols.map(({ name, char }) => (
                  <button
                    key={name}
                    onClick={() => handleInsert(char)}
                    title={name}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-background border border-border text-base font-medium text-foreground hover:bg-accent hover:border-accent-foreground/20 transition-colors"
                  >
                    {char}
                  </button>
                ))}
              </div>
            </div>

            {/* Operator symbols */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground px-1">Operators</span>
              <div className="flex flex-wrap gap-1.5 bg-muted/30 p-3 rounded-2xl justify-center border border-border/50">
                {operatorSymbols.map(({ name, char }) => (
                  <button
                    key={name}
                    onClick={() => handleInsert(char)}
                    title={name}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-background border border-border text-base font-medium text-foreground hover:bg-accent hover:border-accent-foreground/20 transition-colors"
                  >
                    {char}
                  </button>
                ))}
              </div>
            </div>

            {/* Equation input textarea */}
            <textarea
              ref={textareaRef}
              value={value || ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder || "Type equation here..."}
              className="w-full min-h-[100px] p-4 text-lg bg-background border-2 border-border rounded-2xl resize-y focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors text-foreground placeholder:text-muted-foreground"
              style={{ fontFamily: "'Cambria Math', 'Segoe UI', 'Arial Unicode MS', sans-serif" }}
            />

            {/* Tip */}
            <div className="text-xs text-muted-foreground text-center">
              Click symbols to insert · Select text then click "sup ↑" or "sub ↓" to transform
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
