import React, { useRef, useState } from "react";
import { HexColorPicker } from "react-colorful";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Themes from "@/app/_data/Themes";
import GradientBg from "@/app/_data/GradientBg";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import Style, { getStyleCss } from "@/app/_data/Style";
// import { Checkbox, CheckboxIndicator } from "@radix-ui/react-checkbox";

function Controller({
  selectedTheme,
  selectedBackground,
  selectedStyle,
  setSignInEnable,
  previewTheme,
  previewBackground,
}) {
  const [showMore, setShowMore] = useState(6);
  const [styleShowMore, setStyleShowMore] = useState(6);

  // Inline drag-picker state. Preview updates the form live on every drag tick;
  // the DB write is debounced so we don't persist (or toast) on every pixel.
  const [themeColor, setThemeColor] = useState("#7c3aed");
  const [bgColor, setBgColor] = useState("#c7d2fe");
  const themeCommit = useRef();
  const bgCommit = useRef();

  const onThemePick = (hex) => {
    setThemeColor(hex);
    previewTheme?.(hex); // live preview, no persistence
    clearTimeout(themeCommit.current);
    themeCommit.current = setTimeout(() => selectedTheme(hex), 500);
  };

  const onBackgroundPick = (hex) => {
    setBgColor(hex);
    const gradient = `linear-gradient(${hex}, ${hex})`;
    previewBackground?.(gradient);
    clearTimeout(bgCommit.current);
    bgCommit.current = setTimeout(() => selectedBackground(gradient), 500);
  };

  return (
    <div>
      <h2 className="text-base font-semibold mb-1">Themes</h2>

      <Select onValueChange={(value) => selectedTheme(value)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select Theme" />
        </SelectTrigger>
        <SelectContent>
          {Themes.map((theme, index) => (
            <SelectItem value={theme.theme} key={index}>
              <div className="flex gap-3">
                <div className="flex">
                  <div
                    className="h-5 w-5 rounded-l-md"
                    style={{ backgroundColor: theme.primary }}
                  ></div>
                  <div
                    className="h-5 w-5"
                    style={{ backgroundColor: theme.secondary }}
                  ></div>
                  <div
                    className="h-5 w-5"
                    style={{ backgroundColor: theme.accent }}
                  ></div>
                  <div
                    className="h-5 w-5 rounded-r-md"
                    style={{ backgroundColor: theme.neutral }}
                  ></div>
                </div>
                {theme.theme}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="mt-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2 px-2 text-xs"
            >
              <span
                className="h-4 w-4 rounded border shrink-0"
                style={{ backgroundColor: themeColor }}
              />
              Custom color
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3">
            <HexColorPicker color={themeColor} onChange={onThemePick} />
            <div className="mt-2 text-center text-xs font-mono">
              {themeColor}
            </div>
            <p className="mt-1 text-center text-[10px] text-muted-foreground">
              Drag to preview live
            </p>
          </PopoverContent>
        </Popover>
      </div>

      <h2 className="text-base font-semibold mt-8 mb-1">Background</h2>
      <div className="grid grid-cols-3 gap-5">
        {GradientBg.map(
          (bg, index) =>
            index < showMore && (
              <div
                key={index}
                onClick={() => selectedBackground(bg.gradient)}
                className="w-full h-[70px] rounded-lg cursor:pointer hover:border-black hover:border-2 flex items-center justify-center"
                style={{ background: bg.gradient }}
              >
                {index == 0 && "None"}
              </div>
            )
        )}

        {/* Custom color tile — hidden until "Show More" is expanded */}
        {showMore > 6 && (
        <Popover>
          <PopoverTrigger asChild>
            <div
              title="Custom color"
              className="w-full h-[70px] rounded-lg cursor-pointer hover:border-black hover:border-2 flex items-center justify-center text-xs font-medium text-white text-center px-1"
              style={{
                background:
                  "conic-gradient(from 0deg, #ef4444, #f59e0b, #22c55e, #06b6d4, #6366f1, #ec4899, #ef4444)",
                textShadow: "0 1px 2px rgba(0,0,0,0.5)",
              }}
            >
              Custom color
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3">
            <HexColorPicker color={bgColor} onChange={onBackgroundPick} />
            <div className="mt-2 text-center text-xs font-mono">{bgColor}</div>
            <p className="mt-1 text-center text-[10px] text-muted-foreground">
              Drag to preview live
            </p>
          </PopoverContent>
        </Popover>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full my-1"
        onClick={() => setShowMore(showMore > 6 ? 6 : 14)}
      >
        {showMore > 6 ? "Show Less" : "Show More"}
      </Button>

      <div>
        <label className="text-base font-semibold">Style</label>
        <div className="grid grid-cols-3 gap-3 mt-1">
          {Style.map(
            (item, index) =>
              index < styleShowMore && (
                <div key={index}>
                  <div
                    className="cursor-pointer p-2 rounded-lg border border-transparent hover:border-black transition-all"
                    onClick={() => selectedStyle(item)}
                  >
                    <div
                      className="h-[60px] rounded-lg bg-white flex items-center justify-center text-[10px] text-gray-400"
                      style={getStyleCss(item)}
                    >
                      Aa
                    </div>
                  </div>
                  <h2 className="text-center text-xs">{item.name}</h2>
                </div>
              )
          )}
        </div>
        {Style.length > 6 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full my-1"
            onClick={() =>
              setStyleShowMore(styleShowMore > 6 ? 6 : Style.length)
            }
          >
            {styleShowMore > 6 ? "Show Less" : "Show More"}
          </Button>
        )}
      </div>

      <div className="flex gap-2 my-4 items-center mt-10">
        <Checkbox onCheckedChange={(e) => setSignInEnable(e)} />
        <h2>Enable social authentication before submitting the form</h2>
      </div>
    </div>
  );
}

export default Controller;
