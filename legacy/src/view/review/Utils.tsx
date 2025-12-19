

export module Utils {

    /**
  * Uses canvas.measureText to compute and return the width of the given text of given font in pixels.
  * 
  * @param {String} text The text to be rendered.
  * @param {String} font The css font descriptor that text is to be rendered with (e.g. "bold 14px verdana").
  * 
  * @see https://stackoverflow.com/questions/118241/calculate-text-width-with-javascript/21015393#21015393
  */
    var getTextWidthCanvas: HTMLCanvasElement | null = null;
    export function getTextMetrics(text: string, font: string) : TextMetrics {
        // re-use canvas object for better performance
        const canvas = getTextWidthCanvas || (getTextWidthCanvas = document.createElement("canvas"));
        const context = canvas.getContext("2d");

        if (context) {
            context.font = font;
            const metrics = context.measureText(text);
            return metrics;
        }
        return { width: 0, actualBoundingBoxAscent: 0, actualBoundingBoxDescent: 0, fontBoundingBoxAscent: 0, fontBoundingBoxDescent: 0, actualBoundingBoxLeft: 0, actualBoundingBoxRight: 0 } as any;
    }

    export function getCssStyle(element: Element, prop: string) {
        return window.getComputedStyle(element, null).getPropertyValue(prop);
    }

    export function getCanvasFont(el = document.body) {
        const fontWeight = getCssStyle(el, 'font-weight') || 'normal';
        const fontSize = getCssStyle(el, 'font-size') || '16px';
        const fontFamily = getCssStyle(el, 'font-family') || 'Times New Roman';

        return `${fontWeight} ${fontSize} ${fontFamily}`;
    }

    export function caretPositionFromPoint(x: number, y: number) : {offsetNode : Node, offset : number} | null {
        if ((document as any).caretPositionFromPoint) {
            return (document as any).caretPositionFromPoint(x, y);
          } else if (document.caretRangeFromPoint) {
            // Use WebKit-proprietary fallback method
            const range = document.caretRangeFromPoint(x, y);
            if (range) {
                return { offsetNode: range.startContainer, offset: range.startOffset };
            }
          }
          return null;
    }


    export function keyEventToCharacter(event : KeyboardEvent) : string | null {
        const key = event.key;
    
        // Exclude keys with modifiers
        if (event.ctrlKey || event.metaKey) {
            return null;
        }
    
        // Check if the key is a single printable character
        if (key.length === 1) {
            return key;
        }
    
        // Check if the key is a printable special character
        const printableSpecialKeys : {[key: string]: string} = {
            'Enter': '\n',
            'Space': ' ',
            'Tab': '\t'
        };
    
        if (key in printableSpecialKeys) {
            return printableSpecialKeys[key];
        }
    
        return null;
    }
}