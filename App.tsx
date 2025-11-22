import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, Sparkles, GripHorizontal, Copy, Settings, AlertTriangle, Grid, BookOpen, Calculator, Clock } from 'lucide-react';
import { WidgetData, DragMode, DragState, GenerationResponse, WidgetCustomization } from './types';
import WidgetRenderer from './components/WidgetRenderer';
import Modal from './components/Modal';
import { PREMADE_WIDGETS } from './constants/premadeWidgets';
import { 
  GRID_SIZE, 
  MIN_WIDGET_WIDTH, 
  MIN_WIDGET_HEIGHT, 
  DEFAULT_WIDGET_WIDTH, 
  DEFAULT_WIDGET_HEIGHT,
  LOCAL_STORAGE_KEY,
  DEFAULT_CUSTOMIZATION
} from './constants';

// Helper to generate UUID
const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export default function App() {
  // --- State ---
  const [widgets, setWidgets] = useState<WidgetData[]>([]);
  
  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCustomizationModalOpen, setIsCustomizationModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  const [customizingWidgetId, setCustomizingWidgetId] = useState<string | null>(null);
  const [tempCustomization, setTempCustomization] = useState<WidgetCustomization>(DEFAULT_CUSTOMIZATION);

  // Canvas Transforms
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const [dragState, setDragState] = useState<DragState>({
    mode: DragMode.NONE,
    widgetId: null,
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    initialW: 0,
    initialH: 0,
  });

  const canvasRef = useRef<HTMLDivElement>(null);

  // --- Persistence ---
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migration: Ensure all widgets have customization property
        const migrated = parsed.map((w: any) => ({
          ...w,
          customization: w.customization || { ...DEFAULT_CUSTOMIZATION }
        }));
        setWidgets(migrated);
      } catch (e) {
        console.error("Failed to load widgets", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(widgets));
  }, [widgets]);

  // --- Widget Internal State persistence listener ---
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'WIDGET_SAVE_STATE') {
        const { id, data } = event.data;
        
        setWidgets(prevWidgets => prevWidgets.map(w => {
          if (w.id === id) {
             // Only update if data actually changed to avoid loops, although React state setters handle this well
             if (JSON.stringify(w.data) !== JSON.stringify(data)) {
               return { ...w, data };
             }
          }
          return w;
        }));
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // --- Actions ---

  const handleOpenCreate = () => {
    setIsCreateModalOpen(true);
  };

  const handleOpenCustomization = (widget: WidgetData) => {
    setCustomizingWidgetId(widget.id);
    setTempCustomization(widget.customization);
    setIsCustomizationModalOpen(true);
  };

  const handleSaveCustomization = () => {
    if (customizingWidgetId) {
      setWidgets(prev => prev.map(w => 
        w.id === customizingWidgetId 
          ? { ...w, customization: tempCustomization }
          : w
      ));
      setIsCustomizationModalOpen(false);
      setCustomizingWidgetId(null);
    }
  };

  const getViewportCenter = () => {
    const viewportCX = window.innerWidth / 2;
    const viewportCY = window.innerHeight / 2;
    const worldCX = (viewportCX - pan.x) / zoom;
    const worldCY = (viewportCY - pan.y) / zoom;
    return { x: worldCX, y: worldCY };
  };

  const createWidgetFromData = (data: GenerationResponse, titleSuffix: string) => {
    const center = getViewportCenter();
    const offset = widgets.length * 20; 
    
    const newWidget: WidgetData = {
      id: uuidv4(),
      title: data.title || "New Widget",
      html: data.html,
      css: data.css,
      js: data.js,
      position: { 
        x: center.x - (DEFAULT_WIDGET_WIDTH / 2) + (offset % 100), 
        y: center.y - (DEFAULT_WIDGET_HEIGHT / 2) + (offset % 100) 
      },
      size: { w: DEFAULT_WIDGET_WIDTH, h: DEFAULT_WIDGET_HEIGHT },
      zIndex: widgets.length + 1,
      createdAt: Date.now(),
      customization: { ...DEFAULT_CUSTOMIZATION }
    };

    setWidgets(prev => [...prev, newWidget]);
    setIsCreateModalOpen(false);
  };

  const handleCreatePremade = (key: string) => {
    const template = PREMADE_WIDGETS[key];
    if (template) {
      createWidgetFromData(template, template.title);
    }
  };

  const handleDuplicate = (id: string) => {
    const widget = widgets.find(w => w.id === id);
    if (!widget) return;

    const newWidget: WidgetData = {
      ...widget,
      id: uuidv4(),
      title: `${widget.title} (Copy)`,
      position: { 
        x: widget.position.x + 40, 
        y: widget.position.y + 40 
      },
      zIndex: widgets.length + 1,
      createdAt: Date.now(),
      // Important: Deep copy data if it exists to avoid reference sharing
      data: widget.data ? JSON.parse(JSON.stringify(widget.data)) : undefined
    };

    setWidgets(prev => [...prev, newWidget]);
  };

  const handleDeleteClick = (id: string) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = () => {
    if (confirmDeleteId) {
      setWidgets(prev => prev.filter(w => w.id !== confirmDeleteId));
      setConfirmDeleteId(null);
    }
  };

  const handleBringToFront = (id: string) => {
    setWidgets(prev => {
      const maxZ = Math.max(...prev.map(w => w.zIndex), 0);
      return prev.map(w => w.id === id ? { ...w, zIndex: maxZ + 1 } : w);
    });
  };

  // --- Zoom Logic ---

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return; // Let browser handle pinch-zoom if configured
      e.preventDefault();

      // Down (positive) = Zoom Out
      // Up (negative) = Zoom In
      const ZOOM_SENSITIVITY = 0.001;
      const delta = -e.deltaY * ZOOM_SENSITIVITY;
      
      // Clamp zoom level
      const newZoom = Math.min(Math.max(zoom * Math.exp(delta), 0.1), 5);
      
      // Calculate mouse position in world coordinates before zoom
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const worldX = (mouseX - pan.x) / zoom;
      const worldY = (mouseY - pan.y) / zoom;

      // Adjust pan to keep the world point under mouse stationary
      const newPanX = mouseX - worldX * newZoom;
      const newPanY = mouseY - worldY * newZoom;

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      canvas?.removeEventListener('wheel', handleWheel);
    };
  }, [zoom, pan]);

  // --- Drag, Resize & Pan Logic ---

  const onWidgetMouseDown = (e: React.MouseEvent, id: string, mode: DragMode) => {
    e.stopPropagation();
    e.preventDefault();
    
    const widget = widgets.find(w => w.id === id);
    if (!widget) return;

    handleBringToFront(id);

    setDragState({
      mode,
      widgetId: id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: widget.position.x,
      initialY: widget.position.y,
      initialW: widget.size.w,
      initialH: widget.size.h,
    });
  };

  const handleBackgroundMouseDown = (e: React.MouseEvent) => {
    // Left click only
    if (e.button !== 0) return;

    setDragState({
      mode: DragMode.PAN,
      widgetId: null,
      startX: e.clientX,
      startY: e.clientY,
      initialX: pan.x,
      initialY: pan.y,
      initialW: 0,
      initialH: 0,
    });
  };

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (dragState.mode === DragMode.NONE) return;

    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;

    // --- Panning ---
    if (dragState.mode === DragMode.PAN) {
      setPan({
        x: dragState.initialX + dx,
        y: dragState.initialY + dy
      });
      return;
    }

    // --- Widget Manipulation ---
    if (!dragState.widgetId) return;

    // Adjust delta by zoom level to ensure 1:1 tracking
    const scaledDx = dx / zoom;
    const scaledDy = dy / zoom;

    setWidgets(prev => prev.map(w => {
      if (w.id !== dragState.widgetId) return w;

      if (dragState.mode === DragMode.DRAG) {
        let newX = dragState.initialX + scaledDx;
        let newY = dragState.initialY + scaledDy;

        // Snap to grid
        newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
        newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;

        return { ...w, position: { x: newX, y: newY } };
      } 
      else if (dragState.mode === DragMode.RESIZE) {
        let newW = dragState.initialW + scaledDx;
        let newH = dragState.initialH + scaledDy;

        // Snap to grid and enforce min dimensions
        newW = Math.max(MIN_WIDGET_WIDTH, Math.round(newW / GRID_SIZE) * GRID_SIZE);
        newH = Math.max(MIN_WIDGET_HEIGHT, Math.round(newH / GRID_SIZE) * GRID_SIZE);

        return { ...w, size: { w: newW, h: newH } };
      }
      return w;
    }));
  }, [dragState, zoom]);

  const onMouseUp = useCallback(() => {
    if (dragState.mode !== DragMode.NONE) {
      setDragState(prev => ({ ...prev, mode: DragMode.NONE, widgetId: null }));
    }
  }, [dragState.mode]);

  useEffect(() => {
    if (dragState.mode !== DragMode.NONE) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragState.mode, onMouseMove, onMouseUp]);

  // Determine cursor style
  const getCursorStyle = () => {
    if (dragState.mode === DragMode.PAN) return 'cursor-grabbing';
    if (dragState.mode === DragMode.DRAG) return 'cursor-move';
    return 'cursor-grab';
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-zinc-950 text-zinc-100 flex flex-col">
      
      {/* --- Header --- */}
      <header className="h-16 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md flex items-center justify-between px-6 z-40 relative shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.5)]">
            <Sparkles size={18} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
            Kastom
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-xs text-zinc-500 hidden sm:block">
            Scroll to Zoom • Drag Empty Space to Pan
          </div>
          <button 
            onClick={handleOpenCreate}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-full font-medium transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
          >
            <Plus size={18} />
            <span>Add Widget</span>
          </button>
        </div>
      </header>

      {/* --- Dashboard Canvas --- */}
      <div 
        ref={canvasRef}
        className={`flex-1 relative overflow-hidden bg-zinc-950 ${getCursorStyle()}`}
        onMouseDown={handleBackgroundMouseDown}
      >
        {/* Empty State - Centered in Viewport (Overlay) */}
        {widgets.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
            <div className="bg-zinc-900/80 p-8 rounded-2xl border border-zinc-800 text-center max-w-md backdrop-blur-md shadow-xl pointer-events-auto transform transition-transform hover:scale-105">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-semibold text-zinc-200 mb-2">Infinite Canvas</h3>
              <p className="mb-6 text-zinc-400">
                Your dashboard is a boundless creative space.<br/>
                Scroll to zoom, drag to pan.
              </p>
              <button 
                onClick={handleOpenCreate}
                className="text-primary hover:text-primary/80 font-semibold text-sm"
              >
                Add your first widget
              </button>
            </div>
          </div>
        )}

        {/* World Container */}
        <div 
          className="origin-top-left absolute top-0 left-0 will-change-transform"
          style={{ 
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {/* Infinite Grid Background - Huge area centered on 0,0 */}
          <div 
            className="grid-background absolute pointer-events-none"
            style={{
              left: -50000,
              top: -50000,
              width: 100000,
              height: 100000,
              opacity: 0.4
            }}
          />

          {/* Widgets */}
          {widgets.map(widget => (
            <div
              key={widget.id}
              className="absolute flex flex-col border border-zinc-800 bg-zinc-900 shadow-xl group"
              style={{
                transform: `translate(${widget.position.x}px, ${widget.position.y}px)`,
                width: widget.size.w,
                height: widget.size.h,
                zIndex: widget.zIndex,
                borderRadius: `${widget.customization?.borderRadius ?? 16}px`,
                // Disable transitions during drag for instant feedback
                transition: dragState.widgetId === widget.id ? 'none' : 'box-shadow 0.2s',
              }}
              onMouseDown={(e) => onWidgetMouseDown(e, widget.id, DragMode.DRAG)}
            >
              {/* Widget Header / Handle */}
              <div 
                className="h-9 bg-zinc-800/30 border-b border-zinc-800/50 flex items-center justify-between px-3 cursor-move select-none group-hover:bg-zinc-800/80 transition-colors rounded-t-[inherit]"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <GripHorizontal size={14} className="text-zinc-600" />
                  <span className="text-xs font-medium text-zinc-400 truncate max-w-[120px]" title={widget.title}>
                    {widget.title}
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button 
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenCustomization(widget);
                    }}
                    className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-yellow-400"
                    title="Customize Appearance"
                  >
                    <Settings size={12} />
                  </button>
                  
                  <button 
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicate(widget.id);
                    }}
                    className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-green-400"
                    title="Duplicate"
                  >
                    <Copy size={12} />
                  </button>
                  <button 
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(widget.id);
                    }}
                    className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* Widget Content */}
              <div className="flex-1 relative overflow-hidden rounded-b-[inherit]">
                <WidgetRenderer 
                  widget={widget} 
                  isInteracting={dragState.widgetId === widget.id} 
                />
                
                {/* Overlay to block interaction while dragging */}
                {dragState.widgetId === widget.id && (
                  <div className="absolute inset-0 bg-transparent z-50" />
                )}
              </div>

              {/* Resize Handle */}
              <div 
                className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-center justify-center z-20 hover:bg-zinc-700/50 rounded-br-[inherit]"
                onMouseDown={(e) => onWidgetMouseDown(e, widget.id, DragMode.RESIZE)}
              >
                <div className="w-2 h-2 border-r-2 border-b-2 border-zinc-500" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- Delete Confirmation Modal --- */}
      <Modal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        title="Delete Widget"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-red-400 bg-red-400/10 p-3 rounded-lg">
             <AlertTriangle size={24} />
             <p className="text-sm">Are you sure you want to delete this widget? This action cannot be undone.</p>
          </div>
          <div className="flex justify-end gap-2 mt-4">
             <button 
               onClick={() => setConfirmDeleteId(null)}
               className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium"
             >
               Cancel
             </button>
             <button 
               onClick={confirmDelete}
               className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium"
             >
               Delete
             </button>
          </div>
        </div>
      </Modal>

      {/* --- Customization Modal --- */}
      <Modal
        isOpen={isCustomizationModalOpen}
        onClose={() => setIsCustomizationModalOpen(false)}
        title="Customize Widget"
      >
        <div className="space-y-6">
          {/* Background Color */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Background Color</label>
            <div className="grid grid-cols-6 gap-2">
              {[
                'rgba(0,0,0,0)', 
                '#18181b', // zinc-900
                '#09090b', // zinc-950
                '#1e1b4b', // indigo-950
                '#3f3f46', // zinc-700
                '#172554', // blue-950
              ].map((color) => (
                <button
                  key={color}
                  onClick={() => setTempCustomization(p => ({ ...p, backgroundColor: color }))}
                  className={`w-8 h-8 rounded-full border-2 ${tempCustomization.backgroundColor === color ? 'border-white' : 'border-zinc-700'}`}
                  style={{ backgroundColor: color === 'rgba(0,0,0,0)' ? '#000' : color }}
                  title={color}
                >
                   {color === 'rgba(0,0,0,0)' && <span className="text-red-500 text-xs">X</span>}
                </button>
              ))}
            </div>
            <input 
              type="color" 
              value={tempCustomization.backgroundColor !== 'rgba(0,0,0,0)' ? tempCustomization.backgroundColor : '#000000'}
              onChange={(e) => setTempCustomization(p => ({ ...p, backgroundColor: e.target.value }))}
              className="mt-2 w-full h-8 bg-transparent border-0 rounded cursor-pointer"
            />
          </div>

          {/* Font Size */}
          <div>
             <div className="flex justify-between mb-1">
               <label className="text-sm font-medium text-zinc-400">Base Font Size</label>
               <span className="text-xs text-zinc-500">{tempCustomization.fontSize}px</span>
             </div>
             <input 
               type="range" 
               min="10" 
               max="32" 
               step="1"
               value={tempCustomization.fontSize}
               onChange={(e) => setTempCustomization(p => ({ ...p, fontSize: parseInt(e.target.value) }))}
               className="w-full accent-primary"
             />
          </div>

          {/* Border Radius */}
          <div>
             <div className="flex justify-between mb-1">
               <label className="text-sm font-medium text-zinc-400">Border Radius</label>
               <span className="text-xs text-zinc-500">{tempCustomization.borderRadius}px</span>
             </div>
             <input 
               type="range" 
               min="0" 
               max="40" 
               step="4"
               value={tempCustomization.borderRadius}
               onChange={(e) => setTempCustomization(p => ({ ...p, borderRadius: parseInt(e.target.value) }))}
               className="w-full accent-primary"
             />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
            <button 
              onClick={() => setIsCustomizationModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium"
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveCustomization}
              className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium"
            >
              Save Changes
            </button>
          </div>
        </div>
      </Modal>

      {/* --- Add Widget Modal --- */}
      <Modal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        title="Add Widget"
      >
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => handleCreatePremade('TABLE')} 
                className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 hover:ring-2 ring-primary/50 transition-all text-zinc-300 hover:text-white group"
              >
                <div className="bg-zinc-900 p-3 rounded-full group-hover:scale-110 transition-transform">
                  <Grid size={28} className="text-emerald-400" />
                </div>
                <span className="text-sm font-semibold">Smart Table</span>
              </button>

              <button 
                onClick={() => handleCreatePremade('NOTEBOOK')} 
                className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 hover:ring-2 ring-primary/50 transition-all text-zinc-300 hover:text-white group"
              >
                <div className="bg-zinc-900 p-3 rounded-full group-hover:scale-110 transition-transform">
                  <BookOpen size={28} className="text-amber-400" />
                </div>
                <span className="text-sm font-semibold">Notebook</span>
              </button>

              <button 
                onClick={() => handleCreatePremade('CALCULATOR')} 
                className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 hover:ring-2 ring-primary/50 transition-all text-zinc-300 hover:text-white group"
              >
                <div className="bg-zinc-900 p-3 rounded-full group-hover:scale-110 transition-transform">
                  <Calculator size={28} className="text-blue-400" />
                </div>
                <span className="text-sm font-semibold">Calculator</span>
              </button>

              <button 
                onClick={() => handleCreatePremade('CLOCK')} 
                className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 hover:ring-2 ring-primary/50 transition-all text-zinc-300 hover:text-white group"
              >
                <div className="bg-zinc-900 p-3 rounded-full group-hover:scale-110 transition-transform">
                  <Clock size={28} className="text-purple-400" />
                </div>
                <span className="text-sm font-semibold">Time Suite</span>
              </button>
            </div>
        </div>
      </Modal>

    </div>
  );
}