import type { CSSProperties } from "react";
import { createVennJSAdapter, VennDiagram } from "@upsetjs/react";
import { layout } from "@upsetjs/venn.js";
import { lab } from "d3-color";
import type { SNIPePrimerSet } from "../../lib/types";

const vennJSAdapter = createVennJSAdapter(layout);

const mergeColors = (colors: readonly (string | undefined)[]): string | undefined => {
    // inspired by https://upset.js.org/docs/examples/vennColored
    switch (colors.length) {
        case 0:
            return undefined;
        case 1:
            return colors[0];
        default: {
            const ca = colors.reduce(
                (acc, d) => {
                    const c = lab(d || "transparent");
                    return { l: acc.l + c.l, a: acc.a + c.a, b: acc.b + c.b };
                },
                { l: 0, a: 0, b: 0 },
            );

            const res = lab(ca.l / colors.length, ca.a / colors.length, ca.b / colors.length, 0.45);
            return res.formatRgb();
        }
    }
};

// Param values
const combinations = { mergeColors };
const style: CSSProperties = { maxWidth: "100%", height: "auto" };

type PrimerSetEulerDiagramProps = {
    primerSet: SNIPePrimerSet;
};

const PrimerSetEulerDiagram = ({ primerSet }: PrimerSetEulerDiagramProps) => {
    return (
        // @ts-ignore
        <VennDiagram
            layout={vennJSAdapter}
            sets={primerSet.onTarget.coveredTaxaByPrimerUpset}
            width={990}
            height={720}
            theme="light"
            padding={75}
            combinations={combinations}
            style={style}
        />
    );
};

export default PrimerSetEulerDiagram;
