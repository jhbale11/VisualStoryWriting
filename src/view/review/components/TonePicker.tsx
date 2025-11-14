import { Card, CardBody, CardHeader, Divider, Input, Slider } from "@nextui-org/react";
import chroma from "chroma-js";
import React, { useEffect, useMemo, useState } from "react";
import { TextSelection, useReviewModelStore } from "../../../model/review/ReviewModel";
import { TextToneChanger } from "../../../model/review/tools/promptTools/TextToneChanger";
import { useReviewUndoModelStore } from "../../../model/review/UndoModel";
import { useStudyStore } from "../../../study/StudyModel";

export function TonePicker() {
  const tone = useReviewModelStore(state => state.tone);
  const setTone = useReviewModelStore(state => state.setTone);

  const wheelRef = React.createRef<HTMLDivElement>();
  const wheelSize = 180;
  const nToneValues = 10;

  const selectedTexts = useReviewModelStore(state => state.selectedTexts);
  const [isSelectionDifferent, setIsSelectionDifferent] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const toneChanger = useMemo(() => {
    if (selectedTexts.length === 1) {
      // TODO: The intiial values should be obtained automaitcally with a prompt so that it makes sense
      const initialTone = JSON.parse(JSON.stringify(useReviewModelStore.getState().tone));
      // Reset to all 5s
      for (let i = 0; i < initialTone.length; i++) {
        initialTone[i].value = 5;
      }
      return new TextToneChanger(selectedTexts[0].text, initialTone);
    }
    return null;
  }, [isSelectionDifferent]);

  useEffect(() => {
    if (selectedTexts.length === 1 && (!toneChanger || !toneChanger.isValueCached(selectedTexts[0].text))) {
      setIsSelectionDifferent(!isSelectionDifferent);
    }
  }, [selectedTexts]);


  function getColorFromWheelPosition(x: number, y: number, width: number, height: number) {
    const dx = x / width - 0.5;
    const dy = y / height - 0.5;
    const hue = Math.atan2(-dy, -dx) * (360 / (Math.PI * 2))
    const dist = Math.sqrt(dx * dx + dy * dy);

    const s = (Math.min(dist, 0.5) / 0.5);

    const rgb = dist > 0.5 ? [255, 255, 255] : chroma.hsv(hue, s, 1).rgb();

    return [Math.round(rgb[0] / 255 * nToneValues) / nToneValues * 255, Math.round(rgb[1] / 255 * nToneValues) / nToneValues * 255, Math.round(rgb[2] / 255 * nToneValues) / nToneValues * 255];
  }

  function getWheelPositionFromColor(r: number, g: number, b: number, width: number, height: number) {
    const hsv = chroma(r / 255, g / 255, b / 255).hsv();
    const angle = hsv[0] / 360 * 2 * Math.PI;
    const dist = hsv[1];

    const x = -Math.cos(angle) * dist * 0.5 + 0.5;
    const y = -Math.sin(angle) * dist * 0.5 + 0.5;


    return [x * width, y * height];
  }

  function changeSelectedTextTone() {
    if (selectedTexts.length === 1 && toneChanger) {
      toneChanger.cachedExecute(tone).then(result => {
        const newSelection: TextSelection[] = [];
        for (const selectedText of selectedTexts) {
          newSelection.push({ ...selectedText, text: result, isLoading: false });
        }
        useReviewUndoModelStore.getState().storeUndoState();
        useReviewModelStore.getState().animateNextChanges();
        useReviewModelStore.getState().setSelectedTexts(newSelection);
      });
      // Show that the selection is loading
      const newSelection: TextSelection[] = [];
      for (const selectedText of useReviewModelStore.getState().selectedTexts) {
        newSelection.push({ ...selectedText, isLoading: true });
      }
      useReviewModelStore.getState().setSelectedTexts(newSelection);
    }
  }


  const currentWheelPosition = getWheelPositionFromColor(tone[0].value / nToneValues * 255, tone[1].value / nToneValues * 255, tone[2].value / nToneValues * 255, wheelSize, wheelSize);
  const currentWheelColor = `rgb(${tone[0].value / nToneValues * 255}, ${tone[1].value / nToneValues * 255}, ${tone[2].value / nToneValues * 255})`;

  // Calculate guides to help user decide in which direction to move the cursor
  const guides : any[] = [];
  tone.forEach((toneSpace, i) => {
    const direction = toneSpace.value > 5 ? -1 : 1; // Go in the direction that has the most space available
    // Calculate the position of the cursor if we were to go in that direction
    const guideValue = Math.min(toneSpace.value + direction * 3, nToneValues);
    const guidePosition = getWheelPositionFromColor(
      (i === 0 ? guideValue : tone[0].value) / nToneValues * 255,
      (i === 1 ? guideValue : tone[1].value) / nToneValues * 255, 
      (i === 2 ? guideValue : tone[2].value) / nToneValues * 255,
       wheelSize, wheelSize);
    
    // Make sure the guide does not go out of bounds
    const distance = Math.sqrt((guidePosition[0] - currentWheelPosition[0]) ** 2 + (guidePosition[1] - currentWheelPosition[1]) ** 2);
    if (distance < wheelSize / 2) {
      const isLeftSide = guidePosition[0] < currentWheelPosition[0];
      const isBottomSide = guidePosition[1] > currentWheelPosition[1];

      guides.push({name: direction === -1 ? toneSpace.lowAdjective : toneSpace.highAdjective, position: guidePosition, textAnchor: isLeftSide ? "end" : "start", dominantBaseline: isBottomSide ? "hanging" : "auto"});
    }
  });

  useEffect(() => {
    const onMouseUp = (e : MouseEvent) => {
      if (e.button === 0 && isDragging) {
        setIsDragging(false);
        changeSelectedTextTone();
        useStudyStore.getState().logEvent("TONE_CHANGED", {source: 'wheel', tone: useReviewModelStore.getState().tone});
      }
    }
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mouseup', onMouseUp);
    }
  });


  const updateToneFromMousePosition = (e: React.MouseEvent) => {
    if (wheelRef.current) {
      const width = wheelRef.current?.clientWidth;
      const height = wheelRef.current?.clientHeight;
      const rgb = getColorFromWheelPosition(e.clientX - wheelRef.current?.getBoundingClientRect().left, e.clientY - wheelRef.current?.getBoundingClientRect().top, width, height)
      tone[0].value = rgb[0] / 255 * nToneValues;
      tone[1].value = rgb[1] / 255 * nToneValues;
      tone[2].value = rgb[2] / 255 * nToneValues;

      setTone([...tone]);
    }
  }


  return (
    <Card style={{ width: 250, minHeight: 451 }}>
      <CardHeader>
        <span style={{ fontWeight: 600 }}>Tone picker</span>
      </CardHeader>
      <Divider />
      <CardBody>
        <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column', gap: 10 }}>
          <div className={"group"} ref={wheelRef} style={{ position: 'relative', width: wheelSize, height: wheelSize }}
          
          onMouseDown={(e) => {
              if (wheelRef.current && e.button === 0) {
                setIsDragging(true);
                updateToneFromMousePosition(e);
                e.preventDefault();
                e.stopPropagation();
              }
            }
          }

          onMouseMove={(e) => {
              if (isDragging) {
                updateToneFromMousePosition(e);
              }
            }
          }
          >
            <div style={{ position: 'absolute', borderRadius: '50%', transform: 'rotateZ(270deg)', inset: 0, background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }}></div>
            <div style={{ position: 'absolute', borderRadius: '50%', transform: 'rotateZ(270deg)', inset: 0, background: 'radial-gradient(circle closest-side, rgb(255, 255, 255), transparent)' }}></div>
            <div className={"group-[:not(:hover)]:invisible"} style={{ position: 'absolute', left: 0, top: 0, width: wheelSize, height: wheelSize, pointerEvents: 'none', userSelect: 'none' }}>
              <svg width={wheelSize} height={wheelSize} xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <marker id="arrow" markerWidth="10" markerHeight="10" refX="3.5" refY="1.5" orient="auto" markerUnits="strokeWidth">
                    <path d="M0,0 L0,3 L4.5,1.5 z" />
                  </marker>
                </defs>
                {
                  guides.map((guide, i) => {
                    return <g  key={i}>
                      <line markerEnd="url(#arrow)"x1={currentWheelPosition[0]} y1={currentWheelPosition[1]} x2={guide.position[0]} y2={guide.position[1]} stroke="black" strokeWidth="2" />
                      <text  x={guide.position[0]} y={guide.position[1]} textAnchor={guide.textAnchor} dominantBaseline={guide.dominantBaseline} fontSize="10" fill="black">{guide.name}</text>
                    </g> 
                  })
                }
              </svg>
            </div>
            {(!Number.isNaN(currentWheelPosition[0]) && !Number.isNaN(currentWheelPosition[1])) &&
              <div className="drop-shadow-md" style={{ position: 'absolute', left: currentWheelPosition[0] - 8, top: currentWheelPosition[1] - 8, width: 16, height: 16, border: '3px solid white', borderRadius: '50%', background: currentWheelColor }}></div>
            }
          </div>
          {tone.map((t, i) => <div key={i} >
            <div style={{ display: 'flex', flexDirection: 'row', textAlign: 'right', justifyContent: 'space-between', gap: 30 }}>
              <Input size="sm" value={t.lowAdjective} onValueChange={(e) => {
                tone[i].lowAdjective = e;
                useStudyStore.getState().logEvent("TONE_NAMES_CHANGED", {tone: tone});
                setTone([...tone]);
              }}></Input>
              <Input style={{ textAlign: 'right' }} size="sm" value={t.highAdjective} onValueChange={(e) => {
                tone[i].highAdjective = e;
                useStudyStore.getState().logEvent("TONE_NAMES_CHANGED", {tone: tone});
                setTone([...tone]);
              }}></Input>

            </div>
            <Slider aria-label={t.highAdjective} showSteps color={['danger', 'success', 'primary'][i] as any} size='md' minValue={0} maxValue={10} step={1} value={t.value} /*label={t.lowAdjective} */
              onChange={(e) => { tone[i].value = e as number; setTone([...tone]) }}
              onChangeEnd={(e) => {
                useStudyStore.getState().logEvent("TONE_CHANGED", {source: 'slider', tone: tone});
                changeSelectedTextTone();
              }
              }
              classNames={{
                track: `border-none ${['bg-gradient-to-r from-red-50 to-red-600', 'bg-gradient-to-r from-green-50 to-green-600', 'bg-gradient-to-r from-blue-50 to-blue-600'][i]}`,
                filler: "opacity-0",
                thumb: ""
              }}
            ></Slider>
          </div>
          )}
        </div>
      </CardBody>
    </Card>
  )
}
