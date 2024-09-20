import { createContext } from "react";
import { hsl, rgb } from "d3-color";
import { interpolateRainbow, schemeTableau10 } from "d3-scale-chromatic";
import type { SNIPeDataset } from "./datasets";
import type { PrimerPalette } from "./types";

export const paletteForPrimers = (primers: string[]): PrimerPalette =>
    Object.fromEntries(
        primers.map((k, i) => {
            const hslColor = hsl(interpolateRainbow(i / primers.length));
            hslColor.s *= 0.7;
            hslColor.l *= 0.9;
            return [k, rgb(hslColor).formatRgb()];
        }),
    );

export const PrimerPaletteContext = createContext<PrimerPalette>({});

export const supergroupOrGroupColor = (
    dataset: SNIPeDataset,
    supergroup: string,
    group: string | undefined = undefined,
) => {
    const sgGroups = dataset.supergroupGroups[supergroup];
    const color = hsl(schemeTableau10[dataset.supergroups.indexOf(supergroup)]);
    // normalize luminosity to be in the middle of where it is for group bars:
    color.l = group ? 0.25 + ((sgGroups.indexOf(group) + 1) / (sgGroups.length + 1)) * 0.6 : 0.55;
    return color.toString();
};
