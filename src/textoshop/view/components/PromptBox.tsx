import { Button, Input } from "@nextui-org/react";
import React, { useCallback, useEffect, useState } from "react";
import { IoSend } from "react-icons/io5";
import { useModelStore } from "../../model/Model";
import { useViewModelStore } from "../../model/ViewModel";

export function PromptBox() {
  const selectedTexts = useModelStore(state => state.selectedTexts);
  const isPromptBoxOpen = useViewModelStore(state => state.isPromptBoxOpen);
  const closePromptBox = useViewModelStore(state => state.closePromptBox);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [prompt, setPrompt] = useState("");
  const inputRef = React.createRef<HTMLInputElement>();


  useEffect(() => {
    const selectedTextSpans = document.getElementsByClassName('selectedText') as any as HTMLDivElement[];
    if (selectedTextSpans.length > 0) {
      // Find the rectangle that is the lowest (i.e. highest y value), position relative to background container
      const bg = document.getElementById('background');
      const bgRect = bg?.getBoundingClientRect();
      const firstRect = selectedTextSpans[0].getBoundingClientRect();
      let newPosition = { x: firstRect.x + firstRect.width/2, y: firstRect.y + firstRect.height };
      for (let i = 1; i < selectedTextSpans.length; i++) {
        const rect = selectedTextSpans[i].getBoundingClientRect();
        if (rect.y + rect.height > position.y) {
          newPosition = { x: rect.x + rect.width/2, y: rect.y + rect.height };
        }
      }
      if (bgRect) {
        newPosition = { x: newPosition.x - bgRect.left, y: newPosition.y - bgRect.top };
      }
      if (position.x !== newPosition.x && position.y !== newPosition.y) {
        setPrompt("");
        setPosition(newPosition);
        inputRef.current?.focus();
      }
    } else {
      setPosition({ x: 0, y: 0 });
    }
  }, [selectedTexts]);

  const onSendPrompt = useCallback(() => {
    const callback = useViewModelStore.getState().onPromptBoxValidated;
    if (callback) {
      callback(prompt);
    }
    setPrompt("");
    closePromptBox();
  }, [prompt]);

  const isVisible = (position.x !== 0 && position.y !== 0) && isPromptBoxOpen;

  if (!isVisible) return <></>; 

  return (
    <div className="drop-shadow-xl" style={{ position: 'fixed', left: position.x, top: position.y, transform: 'translate(-50%, 0%)', zIndex: 1000002 }}>
      <Input autoFocus ref={inputRef} variant="faded" value={prompt} onClick={(e) => {
        e.stopPropagation();
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
      onMouseUp={(e) => {
        e.stopPropagation();
      }}

      onValueChange={(value) => setPrompt(value)}

      onKeyDown={(e) => {
        if (e.key === "Enter") {
          onSendPrompt();
        }
      }}

      placeholder="Type your prompt here..." endContent={
        <Button size="sm" isIconOnly onClick={onSendPrompt}>
          <IoSend />
        </Button>
      } />
    </div>
  )
}
