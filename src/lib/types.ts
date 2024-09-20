import type { UpSetBaseDataProps } from "@upsetjs/react";
import type { DatasetRecord } from "./datasets";

export type PrimerPalette = Record<string, string>;

export type SNIPeCoverageResult = {
    readonly coverage: number;
    readonly coveredTaxa: Set<string>;
    readonly coveredTaxaByPrimer: Record<string, string[]>;
    readonly coveredTaxaByPrimerUpset: UpSetBaseDataProps<string>["sets"];
    readonly coveredRecords: DatasetRecord[];
    readonly coverageByGroup: Record<string, number>;
    readonly resolutionSummary: Record<string, number>;
};

export type SNIPeTargetMode = "onTarget" | "offTarget" | "total";

export type SNIPePrimerSet = {
    readonly id: string;
    readonly primers: Set<string>;
    readonly nPrimers: number;
    onTarget: SNIPeCoverageResult;
    offTarget?: SNIPeCoverageResult;
    total?: SNIPeCoverageResult;
};

export type SNIPePrimerCombinationResult = {
    nPrimers: number;
    coverage: number;
    coverageFraction: number;
    results: SNIPePrimerSet[];
    avgCoverageByGroup: Record<string, number>;
    avgCoverageByGroupOffTarget?: Record<string, number>;
    avgCoverageByGroupTotal?: Record<string, number>;
};

export type SNIPeResults = SNIPePrimerCombinationResult[];

export type SNIPeSearchParams = {
    selectedRecords: DatasetRecord[];
    allRecords: DatasetRecord[];
    maxPrimers: number;
    includeOffTargetTaxa: boolean;
    primerPalette: PrimerPalette;
};
