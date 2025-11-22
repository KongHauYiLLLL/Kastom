import React, { useMemo, useRef } from 'react';
import { WidgetData } from '../types';

interface WidgetRendererProps {
  widget: WidgetData;
  isInteracting: boolean; // true if dragging/resizing
}

const WidgetRenderer: React.FC<WidgetRendererProps> = ({ widget, isInteracting }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const srcDoc = useMemo(() => {
    // We inject the user customization directly into the styles
    // We also inject the WIDGET_ID and WIDGET_DATA for persistence logic
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              
              /* User Customization Injections */
              background-color: ${widget.customization.backgroundColor}; 
              font-size: ${widget.customization.fontSize}px;
              
              color: #fff;
              height: 100vh;
              width: 100vw;
              overflow: hidden;
            }
            /* Scrollbar styling inside widget */
            ::-webkit-scrollbar { width: 4px; height: 4px; }
            ::-webkit-scrollbar-thumb { background: #555; border-radius: 2px; }
            * { box-sizing: border-box; }
          </style>
          <style>
            ${widget.css}
          </style>
          <script>
             // INJECTED CONSTANTS
             window.WIDGET_ID = "${widget.id}";
             window.WIDGET_DATA = ${JSON.stringify(widget.data || null)};

             // Helper function for widgets to save state to parent
             window.sendWidgetState = (data) => {
               window.parent.postMessage({
                 type: 'WIDGET_SAVE_STATE',
                 id: window.WIDGET_ID,
                 data: data
               }, '*');
             };
          </script>
        </head>
        <body>
          ${widget.html}
          <script>
            try {
              ${widget.js}
            } catch (e) {
              console.error("Widget Runtime Error:", e);
              document.body.innerHTML += '<div style="color:red; padding:10px; font-size:12px;">Runtime Error: ' + e.message + '</div>';
            }
          </script>
        </body>
      </html>
    `;
    // IMPORTANT: We intentionally do NOT include widget.data in the dependency array.
    // The data is injected initially. If the data updates in the parent (via save),
    // we do NOT want to regenerate the iframe (which would reload it and lose focus).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widget.html, widget.css, widget.js, widget.customization, widget.id]);

  // Disable pointer events on iframe during drag/resize to prevent swallowing events
  const pointerEvents = isInteracting ? 'none' : 'auto';

  return (
    <div 
      className="w-full h-full bg-zinc-900/50 overflow-hidden relative transition-all"
      style={{ 
        borderRadius: `${widget.customization.borderRadius}px` 
      }}
    >
      <iframe
        ref={iframeRef}
        title={widget.title}
        srcDoc={srcDoc}
        className="w-full h-full border-0 block"
        sandbox="allow-scripts allow-forms allow-same-origin allow-modals"
        style={{ pointerEvents }}
      />
    </div>
  );
};

// Custom comparison to prevent re-renders when only 'data' changes
// This is critical: when the widget sends data to parent, parent updates state.
// If this component re-renders, the iframe reloads, killing the user's typing flow.
const arePropsEqual = (prev: WidgetRendererProps, next: WidgetRendererProps) => {
  return (
    prev.isInteracting === next.isInteracting &&
    prev.widget.id === next.widget.id &&
    prev.widget.html === next.widget.html &&
    prev.widget.css === next.widget.css &&
    prev.widget.js === next.widget.js &&
    prev.widget.customization === next.widget.customization &&
    prev.widget.size.w === next.widget.size.w &&
    prev.widget.size.h === next.widget.size.h
    // We intentionally ignore 'prev.widget.data === next.widget.data'
  );
};

export default React.memo(WidgetRenderer, arePropsEqual);