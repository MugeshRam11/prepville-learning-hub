import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Grid3X3, 
  Move, 
  GitBranch, 
  Calculator, 
  List, 
  PenTool,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface BoundingBox {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
}

interface DetectedRegion {
  id: string;
  question_number: string;
  interactive_type: string;
  bounding_box: BoundingBox | null;
  graph_description?: string;
  diagram_type?: string;
  parsing_verified?: boolean;
  draggable_items?: string[];
}

interface PageRegionsOverlayProps {
  sourceImage: string;
  regions: DetectedRegion[];
  pageNumber?: number;
  onRegionClick?: (region: DetectedRegion) => void;
  onTypeChange?: (regionId: string, newType: string) => void;
  className?: string;
}

// Interactive type colors and icons - includes all parser and block types
const INTERACTIVE_TYPE_CONFIG: Record<string, { 
  color: string; 
  bgColor: string; 
  borderColor: string;
  icon: React.ComponentType<any>;
  label: string;
  emoji: string;
}> = {
  // Parser-detected types
  graph_plot: { 
    color: 'text-blue-700 dark:text-blue-300', 
    bgColor: 'bg-blue-100/90 dark:bg-blue-900/80', 
    borderColor: 'border-blue-500',
    icon: Grid3X3,
    label: 'Graph Plot',
    emoji: '📊'
  },
  graph_interaction: { 
    color: 'text-blue-700 dark:text-blue-300', 
    bgColor: 'bg-blue-100/90 dark:bg-blue-900/80', 
    borderColor: 'border-blue-500',
    icon: Grid3X3,
    label: 'Graph Interaction',
    emoji: '📈'
  },
  drag_drop: { 
    color: 'text-purple-700 dark:text-purple-300', 
    bgColor: 'bg-purple-100/90 dark:bg-purple-900/80', 
    borderColor: 'border-purple-500',
    icon: Move,
    label: 'Drag & Drop',
    emoji: '🎯'
  },
  drag_drop_match: { 
    color: 'text-purple-700 dark:text-purple-300', 
    bgColor: 'bg-purple-100/90 dark:bg-purple-900/80', 
    borderColor: 'border-purple-500',
    icon: Move,
    label: 'Drag & Match',
    emoji: '🔀'
  },
  image_drop: { 
    color: 'text-green-700 dark:text-green-300', 
    bgColor: 'bg-green-100/90 dark:bg-green-900/80', 
    borderColor: 'border-green-500',
    icon: GitBranch,
    label: 'Venn/Tree',
    emoji: '🌳'
  },
  image_drop_zone: { 
    color: 'text-green-700 dark:text-green-300', 
    bgColor: 'bg-green-100/90 dark:bg-green-900/80', 
    borderColor: 'border-green-500',
    icon: GitBranch,
    label: 'Interactive Diagram',
    emoji: '📌'
  },
  smart_math: { 
    color: 'text-orange-700 dark:text-orange-300', 
    bgColor: 'bg-orange-100/90 dark:bg-orange-900/80', 
    borderColor: 'border-orange-500',
    icon: Calculator,
    label: 'Math Input',
    emoji: '🧮'
  },
  math_input: { 
    color: 'text-orange-700 dark:text-orange-300', 
    bgColor: 'bg-orange-100/90 dark:bg-orange-900/80', 
    borderColor: 'border-orange-500',
    icon: Calculator,
    label: 'Smart Math',
    emoji: '🔢'
  },
  multiple_choice: { 
    color: 'text-cyan-700 dark:text-cyan-300', 
    bgColor: 'bg-cyan-100/90 dark:bg-cyan-900/80', 
    borderColor: 'border-cyan-500',
    icon: List,
    label: 'MCQ',
    emoji: '✅'
  },
  arrange_order: { 
    color: 'text-pink-700 dark:text-pink-300', 
    bgColor: 'bg-pink-100/90 dark:bg-pink-900/80', 
    borderColor: 'border-pink-500',
    icon: List,
    label: 'Step Order',
    emoji: '📋'
  },
  step_builder: { 
    color: 'text-pink-700 dark:text-pink-300', 
    bgColor: 'bg-pink-100/90 dark:bg-pink-900/80', 
    borderColor: 'border-pink-500',
    icon: List,
    label: 'Step Builder',
    emoji: '🪜'
  },
  text_equation: { 
    color: 'text-gray-700 dark:text-gray-300', 
    bgColor: 'bg-gray-100/90 dark:bg-gray-800/80', 
    borderColor: 'border-gray-500',
    icon: PenTool,
    label: 'Text/Equation',
    emoji: '✏️'
  },
  text_input: { 
    color: 'text-gray-700 dark:text-gray-300', 
    bgColor: 'bg-gray-100/90 dark:bg-gray-800/80', 
    borderColor: 'border-gray-500',
    icon: PenTool,
    label: 'Text Answer',
    emoji: '📝'
  }
};

const PageRegionsOverlay: React.FC<PageRegionsOverlayProps> = ({
  sourceImage,
  regions,
  pageNumber = 1,
  onRegionClick,
  onTypeChange,
  className
}) => {
  const [showOverlay, setShowOverlay] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  const handleRegionClick = (region: DetectedRegion) => {
    setSelectedRegion(region.id === selectedRegion ? null : region.id);
    onRegionClick?.(region);
  };

  const getTypeConfig = (type: string) => {
    return INTERACTIVE_TYPE_CONFIG[type] || INTERACTIVE_TYPE_CONFIG.text_equation;
  };

  // Count regions by type
  const typeCounts = regions.reduce((acc, r) => {
    const type = r.interactive_type || 'text_equation';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Count verified vs unverified
  const verifiedCount = regions.filter(r => r.parsing_verified !== false).length;
  const diagramCount = regions.filter(r => r.bounding_box).length;

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      {/* Header controls */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Page {pageNumber}</Badge>
          <Badge variant="outline" className="gap-1">
            <CheckCircle className="h-3 w-3 text-green-500" />
            {verifiedCount}/{regions.length} verified
          </Badge>
          {diagramCount > 0 && (
            <Badge variant="outline" className="gap-1 bg-blue-50 dark:bg-blue-900/30">
              📊 {diagramCount} diagrams
            </Badge>
          )}
        </div>
        
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowOverlay(!showOverlay)}
            className="h-7 px-2"
          >
            {showOverlay ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span className="ml-1 text-xs">{showOverlay ? 'Hide' : 'Show'}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(z => Math.min(z + 0.25, 2))}
            className="h-7 px-2"
            disabled={zoom >= 2}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}
            className="h-7 px-2"
            disabled={zoom <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Image container with zoom */}
      <div 
        className="relative overflow-auto bg-muted/30"
        style={{ maxHeight: '500px' }}
      >
        <div 
          className="relative inline-block transition-transform duration-200"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
        >
          {/* Source image */}
          <img 
            src={sourceImage} 
            alt={`Page ${pageNumber}`}
            className="w-full h-auto max-w-none"
          />

          {/* Bounding box overlays */}
          <AnimatePresence>
            {showOverlay && regions.map((region) => {
              if (!region.bounding_box) return null;
              
              const { x_min, y_min, x_max, y_max } = region.bounding_box;
              const config = getTypeConfig(region.interactive_type || 'text_equation');
              const IconComponent = config.icon;
              const isSelected = selectedRegion === region.id;
              const isHovered = hoveredRegion === region.id;
              const hasWarning = region.parsing_verified === false;
              
              return (
                <motion.div
                  key={region.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={cn(
                    "absolute cursor-pointer transition-all duration-150",
                    "border-2 rounded-sm",
                    config.borderColor,
                    isSelected ? "border-[3px] shadow-xl z-20" : "border-dashed",
                    isHovered ? "opacity-100 shadow-lg z-10" : "opacity-80",
                    hasWarning && "border-red-500 border-solid"
                  )}
                  style={{
                    left: `${x_min}%`,
                    top: `${y_min}%`,
                    width: `${x_max - x_min}%`,
                    height: `${y_max - y_min}%`,
                    backgroundColor: isSelected || isHovered 
                      ? 'rgba(0,0,0,0.05)' 
                      : 'transparent'
                  }}
                  onClick={() => handleRegionClick(region)}
                  onMouseEnter={() => setHoveredRegion(region.id)}
                  onMouseLeave={() => setHoveredRegion(null)}
                >
                  {/* Type badge on top-left */}
                  <div 
                    className={cn(
                      "absolute -top-6 -left-0.5 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap shadow-sm",
                      config.bgColor,
                      config.color
                    )}
                  >
                    <span>{config.emoji}</span>
                    <span>Q{region.question_number}</span>
                    {hasWarning && <AlertTriangle className="h-3 w-3 text-red-500" />}
                  </div>

                  {/* Interactive type label on top-right */}
                  <div 
                    className={cn(
                      "absolute -top-6 -right-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap shadow-sm",
                      config.bgColor,
                      config.color
                    )}
                  >
                    {config.label}
                  </div>

                  {/* Diagram type indicator */}
                  {region.diagram_type && (
                    <div className="absolute bottom-0 left-0 right-0 text-center">
                      <span className={cn(
                        "inline-block px-1 py-0.5 text-[9px] rounded-t",
                        config.bgColor,
                        config.color
                      )}>
                        {region.diagram_type.replace('_', ' ')}
                      </span>
                    </div>
                  )}

                  {/* Corner handles for selected */}
                  {isSelected && (
                    <>
                      <div className="absolute -left-1 -top-1 w-2 h-2 bg-primary rounded-full" />
                      <div className="absolute -right-1 -top-1 w-2 h-2 bg-primary rounded-full" />
                      <div className="absolute -left-1 -bottom-1 w-2 h-2 bg-primary rounded-full" />
                      <div className="absolute -right-1 -bottom-1 w-2 h-2 bg-primary rounded-full" />
                    </>
                  )}

                  {/* Description tooltip on hover */}
                  {(isHovered || isSelected) && region.graph_description && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute top-full left-0 mt-1 p-2 bg-popover text-popover-foreground text-xs rounded-md shadow-lg max-w-[220px] z-30 border"
                    >
                      <p className="font-medium mb-1">Description:</p>
                      <p className="text-muted-foreground">{region.graph_description}</p>
                      {region.draggable_items && region.draggable_items.length > 0 && (
                        <div className="mt-2">
                          <p className="font-medium">Draggable items:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {region.draggable_items.slice(0, 5).map((item, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] py-0">
                                {item}
                              </Badge>
                            ))}
                            {region.draggable_items.length > 5 && (
                              <Badge variant="outline" className="text-[10px] py-0">
                                +{region.draggable_items.length - 5} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Type legend footer */}
      <div className="flex flex-wrap items-center gap-1.5 p-2 border-t bg-muted/30">
        {Object.entries(typeCounts).map(([type, count]) => {
          const config = getTypeConfig(type);
          return (
            <Badge 
              key={type}
              variant="outline" 
              className={cn("text-[10px] gap-1", config.bgColor, config.color)}
            >
              <span>{config.emoji}</span>
              <span>{config.label}:</span>
              <span className="font-bold">{count}</span>
            </Badge>
          );
        })}
        
        {regions.length === 0 && (
          <span className="text-xs text-muted-foreground">No regions detected on this page</span>
        )}
      </div>
    </Card>
  );
};

export default PageRegionsOverlay;
