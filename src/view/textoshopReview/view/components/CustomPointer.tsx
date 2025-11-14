import React, { useEffect } from "react";
import { tools, useModelStore } from "../../model/Model";

export function CustomPointer() {
  const selectedToolStr = useModelStore(state => state.selectedTool);
  const cursorRef = React.createRef<HTMLDivElement>();


  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (cursorRef.current) {
        cursorRef.current.style.left = (e.clientX-2) + 'px';
        cursorRef.current.style.top = (e.clientY-2) + 'px';
      }
    }
    window.addEventListener('mousemove', onMouseMove);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
    }
  }, [selectedToolStr]);


  return <div ref={cursorRef} style={{position: 'absolute', width: 5, height: 5, background: 'red', zIndex: 9999, pointerEvents: 'none'}}>
  </div>
}
