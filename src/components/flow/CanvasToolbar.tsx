import { useState } from "react";
import { useReactFlow, useViewport } from "@xyflow/react";
import { Maximize2, Minus, Plus, Map as MapIcon, LocateFixed } from "lucide-react";
import { cn } from "@/lib/utils";

export function CanvasToolbar({ selectedCount }: { selectedCount: number }) {
  const { zoomIn, zoomOut, fitView, setViewport } = useReactFlow();
  const { zoom } = useViewport();
  const [minimap, setMinimap] = useState(true);

  const btn =
    "flex size-7 items-center justify-center rounded-[5px] text-[#B5BAC1] transition hover:bg-white/8 hover:text-[#F2F3F5]";

  return (
    <>
      <style>{`.react-flow__minimap{display:${minimap ? "block" : "none"}}`}</style>
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1 rounded-lg border border-white/8 bg-[#18191C]/95 p-1 shadow-[0_2px_12px_rgba(0,0,0,0.4)] backdrop-blur">
        <button type="button" className={btn} onClick={() => zoomOut({ duration: 150 })} aria-label="Zoom out">
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <span className="min-w-11 text-center font-mono text-[11px] text-[#B5BAC1]">
          {Math.round(zoom * 100)}%
        </span>
        <button type="button" className={btn} onClick={() => zoomIn({ duration: 150 })} aria-label="Zoom in">
          <Plus className="size-4" aria-hidden="true" />
        </button>
        <span className="mx-0.5 h-4 w-px bg-white/10" aria-hidden="true" />
        <button
          type="button"
          className={btn}
          onClick={() => fitView({ padding: 0.2, duration: 300 })}
          aria-label="Fit view"
        >
          <Maximize2 className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 300 })}
          aria-label="Reset viewport"
        >
          <LocateFixed className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          className={cn(btn, minimap && "bg-white/8 text-[#F2F3F5]")}
          onClick={() => setMinimap((m) => !m)}
          aria-pressed={minimap}
          aria-label="Toggle minimap"
        >
          <MapIcon className="size-4" aria-hidden="true" />
        </button>
        {selectedCount > 1 && (
          <span className="ml-1 rounded-[4px] bg-[#5865F2]/20 px-1.5 py-0.5 text-[11px] text-[#a9b1ff]">
            {selectedCount} selected
          </span>
        )}
      </div>
    </>
  );
}
