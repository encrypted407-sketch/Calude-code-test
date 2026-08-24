"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import { getStroke } from "perfect-freehand";
import { Undo2, Redo2, Eraser, Trash2, Pen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Point {
  x: number;
  y: number;
  pressure: number;
}

interface Stroke {
  points: Point[];
  color: string;
  size: number;
  tool: "pen" | "eraser";
}

const COLORS = ["#1a1d29", "#e0554f", "#4f6df5", "#2e9e5b", "#d99a1b"];

export interface DrawingCanvasHandle {
  /** Returns a base64 PNG (no data: prefix) of the current drawing, or null if the canvas is blank. */
  exportPng: () => string | null;
  clear: () => void;
}

export const DrawingCanvas = forwardRef<DrawingCanvasHandle, { className?: string }>(
  function DrawingCanvas({ className }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [redoStack, setRedoStack] = useState<Stroke[]>([]);
    const [color, setColor] = useState(COLORS[0]);
    const [size, setSize] = useState(4);
    const [tool, setTool] = useState<"pen" | "eraser">("pen");

    const currentStroke = useRef<Stroke | null>(null);
    const activePointerId = useRef<number | null>(null);
    const sawPenInput = useRef(false);

    const redraw = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

      const allStrokes = currentStroke.current ? [...strokes, currentStroke.current] : strokes;

      for (const stroke of allStrokes) {
        if (stroke.points.length === 0) continue;
        const outline = getStroke(
          stroke.points.map((p) => [p.x, p.y, p.pressure]),
          {
            size: stroke.size,
            thinning: 0.6,
            smoothing: 0.5,
            streamline: 0.5,
          }
        );
        if (outline.length === 0) continue;

        ctx.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
        ctx.fillStyle = stroke.color;
        ctx.beginPath();
        ctx.moveTo(outline[0][0], outline[0][1]);
        for (const [x, y] of outline.slice(1)) {
          ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    }, [strokes]);

    useEffect(() => {
      redraw();
    }, [redraw]);

    useEffect(() => {
      function resize() {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;
        const dpr = window.devicePixelRatio || 1;
        const { width, height } = container.getBoundingClientRect();
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        redraw();
      }
      resize();
      window.addEventListener("resize", resize);
      return () => window.removeEventListener("resize", resize);
    }, [redraw]);

    function getRelativePoint(e: React.PointerEvent<HTMLCanvasElement>): Point {
      const rect = e.currentTarget.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        pressure: e.pressure > 0 ? e.pressure : 0.5,
      };
    }

    function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
      if (e.pointerType === "pen") sawPenInput.current = true;
      // Palm rejection: once a stylus has been used, ignore touch input entirely.
      if (e.pointerType === "touch" && sawPenInput.current) return;
      if (e.button !== undefined && e.button > 0) return;

      e.currentTarget.setPointerCapture(e.pointerId);
      activePointerId.current = e.pointerId;
      setRedoStack([]);
      currentStroke.current = {
        points: [getRelativePoint(e)],
        color,
        size,
        tool,
      };
      redraw();
    }

    function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
      if (activePointerId.current !== e.pointerId || !currentStroke.current) return;
      currentStroke.current.points.push(getRelativePoint(e));
      redraw();
    }

    function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
      if (activePointerId.current !== e.pointerId) return;
      activePointerId.current = null;
      const finishedStroke = currentStroke.current;
      currentStroke.current = null;
      if (finishedStroke && finishedStroke.points.length > 1) {
        setStrokes((s) => [...s, finishedStroke]);
      }
      redraw();
    }

    function undo() {
      setStrokes((s) => {
        if (s.length === 0) return s;
        setRedoStack((r) => [...r, s[s.length - 1]]);
        return s.slice(0, -1);
      });
    }

    function redo() {
      setRedoStack((r) => {
        if (r.length === 0) return r;
        setStrokes((s) => [...s, r[r.length - 1]]);
        return r.slice(0, -1);
      });
    }

    function clearAll() {
      setStrokes([]);
      setRedoStack([]);
    }

    useImperativeHandle(ref, () => ({
      exportPng: () => {
        const canvas = canvasRef.current;
        if (!canvas || strokes.length === 0) return null;
        return canvas.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");
      },
      clear: clearAll,
    }));

    return (
      <div className={cn("flex flex-col gap-3", className)}>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-2">
          <div className="flex items-center gap-1">
            <ToolButton active={tool === "pen"} onClick={() => setTool("pen")} label="Pen">
              <Pen className="h-4 w-4" />
            </ToolButton>
            <ToolButton active={tool === "eraser"} onClick={() => setTool("eraser")} label="Eraser">
              <Eraser className="h-4 w-4" />
            </ToolButton>
          </div>

          <div className="flex items-center gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c}
                aria-label={`Colour ${c}`}
                onClick={() => {
                  setColor(c);
                  setTool("pen");
                }}
                className={cn(
                  "h-6 w-6 rounded-full border-2 transition-transform",
                  color === c && tool === "pen"
                    ? "scale-110 border-foreground"
                    : "border-transparent"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => {
                setColor(e.target.value);
                setTool("pen");
              }}
              className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent p-0"
              aria-label="Custom colour"
            />
          </div>

          <input
            type="range"
            min={1}
            max={20}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-24"
            aria-label="Stroke width"
          />

          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={undo} disabled={strokes.length === 0}>
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={redo} disabled={redoStack.length === 0}>
              <Redo2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={clearAll} disabled={strokes.length === 0}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div
          ref={containerRef}
          className="relative h-80 w-full touch-none overflow-hidden rounded-lg border border-border bg-white sm:h-96"
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        </div>
      </div>
    );
  }
);

function ToolButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface-muted"
      )}
    >
      {children}
    </button>
  );
}
