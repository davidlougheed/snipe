import { createContext } from "react";
import { hsl, rgb } from "d3-color";
import { interpolateRainbow } from "d3-scale-chromatic";

export const paletteForPrimers = (primers) =>
    Object.fromEntries(primers.map((k, i) => {
        const hslColor = hsl(interpolateRainbow(i / primers.length));
        hslColor.s *= 0.7;
        hslColor.l *= 0.9;
        return [k, rgb(hslColor).formatRgb()];
    }));

export const PrimerPaletteContext = createContext({});
