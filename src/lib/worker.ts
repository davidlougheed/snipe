import { asSets } from "@upsetjs/react";
import groupBy from "lodash/groupBy";
import { rgb } from "d3-color";
import {
    COL_FINAL_ID,
    COL_RESOLUTION,
    COL_TAXA_GROUP,
    type DatasetRecord,
    OVERVIEW_GROUPINGS,
    taxaGroup,
    TaxaTreeNode,
} from "./datasets";
import type { PrimerPalette, SNIPeCoverageResult, SNIPePrimerSet, SNIPeResults, SNIPeSearchParams } from "./types";

// Types ---------------------------------------------------------------------------------------------------------------

export type ProgressMessage = {
    type: "progress";
    data: { nPrimers: number; percent: number };
};

export type ResultsMessage = {
    type: "result";
    data: { params: SNIPeSearchParams; results: SNIPeResults };
};

// Helpers -------------------------------------------------------------------------------------------------------------

// Inspired by https://stackoverflow.com/a/64414875
const chooseRec = <T>(arr: T[], k: number, prefix: T[]): T[][] =>
    k === 0
        ? [prefix] // Base case: return existing combination
        : arr.flatMap((v, i) => chooseRec(arr.slice(i + 1), k - 1, [...prefix, v]));
const choose = <T>(arr: T[], k: number): Set<T>[] => chooseRec(arr, k, []).map((c) => new Set(c));

// Processing ----------------------------------------------------------------------------------------------------------

const PROGRESS_EVERY_N = 500;

const calculateGroupCoverage = (tree: TaxaTreeNode[]): Record<string, number> =>
    Object.fromEntries(tree.map((g) => [g.title, g.children?.length ?? 0]));

const computePrimerSetCovered = (
    records: DatasetRecord[],
    primerSet: Set<string>,
    primerPalette: PrimerPalette,
): SNIPeCoverageResult => {
    const coveredTaxa: Set<string> = new Set();
    const coveredTaxaByPrimer: Record<string, string[]> = {};
    const coveredRecords: DatasetRecord[] = [];

    records.forEach((rec) => {
        const finalID = rec[COL_FINAL_ID];

        if (coveredTaxa.has(finalID)) {
            // TODO: I think this was an artifact from when we had accidentally duplicate records, this should
            //  never happen in practice.
            coveredRecords.push(rec);
            return;
        }

        const intersect = rec.primers.filter((p) => primerSet.has(p));

        intersect.forEach((p) => {
            if (!(p in coveredTaxaByPrimer)) {
                coveredTaxaByPrimer[p] = [finalID];
            } else {
                coveredTaxaByPrimer[p].push(finalID);
            }
        });

        if (intersect.length) {
            coveredTaxa.add(finalID);
            coveredRecords.push(rec);
        }
    });

    return {
        coverage: coveredTaxa.size,
        coveredTaxa,
        coveredTaxaByPrimer,
        coveredTaxaByPrimerUpset: asSets(
            Object.entries(coveredTaxaByPrimer).map(([p, pTaxa]) => {
                const color = rgb(primerPalette[p]);
                color.opacity = 0.45;
                return {
                    name: p,
                    elems: pTaxa,
                    color: color.formatRgb(),
                };
            }),
        ),
        coveredRecords,
        coverageByGroup: calculateGroupCoverage(taxaGroup(coveredRecords, OVERVIEW_GROUPINGS)),
        resolutionSummary: Object.fromEntries(
            Object.entries(groupBy(coveredRecords, COL_RESOLUTION)).map(([k, v]) => [k, v.length]),
        ),
    };
};

const avgCoverageByGroupForResult = (records: DatasetRecord[], resCovByGroupArr: Record<string, number>[]) => {
    const baseCoverageByGroup = Object.fromEntries(records.map((rec) => [rec[COL_TAXA_GROUP], 0]));
    return Object.fromEntries(
        Object.entries(
            resCovByGroupArr.reduce((acc, res) => {
                Object.entries(res).forEach(([g, v]) => {
                    acc[g] += v;
                });
                return acc;
            }, baseCoverageByGroup),
        ).map(([g, v]) => [g, v / resCovByGroupArr.length]),
    );
};

const findBestPrimerSets = (params: SNIPeSearchParams) => {
    const { selectedRecords, allRecords, maxPrimers, includeOffTargetTaxa, primerPalette } = params;

    const selectedFinalIDs = new Set(selectedRecords.map((rec) => rec[COL_FINAL_ID]));

    // Compute off-target taxa if needed
    const offTargetRecords: DatasetRecord[] = includeOffTargetTaxa
        ? allRecords.filter((rec) => !selectedFinalIDs.has(rec[COL_FINAL_ID]))
        : [];

    // Make records index-able by final ID - this way we can find, e.g., groups from final IDs
    const nTaxa = selectedRecords.length;

    // Subset of primers which can be used to identify
    const primerSubset: string[] = Array.from(new Set(selectedRecords.flatMap((rec) => rec.primers)));
    // - This is the largest possible set of primers we'll need, but fewer may be sufficient.
    const maxPrimersNeeded = Math.min(maxPrimers, primerSubset.length);

    const bestPrimerCombinations = []; // array-indexed by (nPrimers - 1)

    const nPrimersArray = [...new Array(maxPrimersNeeded)].map((_, i) => i + 1); // [1, 2, ..., maxPrimersNeeded]

    const allPrimerCombinations: Set<string>[][] = nPrimersArray.map((np) => choose(primerSubset, np));

    let nTriedPrimerCombinations = 0;
    const nTotalPrimerCombinations = allPrimerCombinations.flat().length;

    const sendProgress = (nPrimers: number) => {
        postMessage({
            type: "progress",
            data: { nPrimers, percent: (nTriedPrimerCombinations / nTotalPrimerCombinations) * 100 },
        } as ProgressMessage);
    };

    for (const nPrimers of nPrimersArray) {
        const primerCombinations = allPrimerCombinations[nPrimers - 1];

        console.info(`trying ${nPrimers}/${maxPrimersNeeded} for ${selectedRecords.length} records`);

        let bestCoverage = 0;
        let bestResultsForPrimerCount: SNIPePrimerSet[] = [];

        primerCombinations.forEach((pc) => {
            const selectedCoveredResult = computePrimerSetCovered(selectedRecords, pc, primerPalette);
            const { coverage } = selectedCoveredResult;

            let offTargetCoveredResult = undefined;
            let totalCoveredResult = undefined;

            if (offTargetRecords) {
                offTargetCoveredResult = computePrimerSetCovered(offTargetRecords, pc, primerPalette);
                totalCoveredResult =
                    selectedRecords.length === allRecords.length
                        ? selectedCoveredResult
                        : computePrimerSetCovered(allRecords, pc, primerPalette);
            }

            if (coverage > bestCoverage) {
                bestCoverage = coverage;
                bestResultsForPrimerCount = [];
            }

            const res: SNIPePrimerSet = {
                id: `${pc.size}-${bestResultsForPrimerCount.length + 1}`,
                nPrimers,
                primers: pc,
                // On-target coverage / summary information:
                onTarget: selectedCoveredResult,
                // Off-target coverage information - nested in object:
                offTarget: offTargetCoveredResult,
                // Whole-dataset coverage information - nested in object:
                total: totalCoveredResult,
            };

            if (coverage === bestCoverage) {
                // If coverage was greater than bestCoverage, we updated bestCoverage above.
                bestResultsForPrimerCount.push(res);
            }
            // Otherwise, discard

            nTriedPrimerCombinations += 1;

            if (nTriedPrimerCombinations % PROGRESS_EVERY_N === 0) {
                sendProgress(nPrimers);
            }
        });

        const bestCoverageFraction = bestCoverage / nTaxa;

        const avgCoverageByGroup = avgCoverageByGroupForResult(
            selectedRecords,
            bestResultsForPrimerCount.map((res) => res.onTarget.coverageByGroup),
        );

        let avgCoverageByGroupOffTarget = undefined;
        let avgCoverageByGroupTotal = undefined;

        if (includeOffTargetTaxa) {
            avgCoverageByGroupOffTarget = avgCoverageByGroupForResult(
                offTargetRecords,
                bestResultsForPrimerCount.map((res) => res.offTarget!.coverageByGroup),
            );
            avgCoverageByGroupTotal = avgCoverageByGroupForResult(
                allRecords,
                bestResultsForPrimerCount.map((res) => res.total!.coverageByGroup),
            );
        }

        console.info(`calculated average coverage by group:`, avgCoverageByGroup);

        bestPrimerCombinations.push({
            nPrimers,
            coverage: bestCoverage,
            coverageFraction: bestCoverageFraction,
            results: bestResultsForPrimerCount,
            avgCoverageByGroup,
            avgCoverageByGroupOffTarget,
            avgCoverageByGroupTotal,
        });

        console.info(
            `best primer combinations: coverage=${(bestCoverageFraction * 100).toFixed(1)}`,
            bestResultsForPrimerCount,
        );

        sendProgress(nPrimers);

        console.info(
            `processed ${primerCombinations.length} combinations for ${nPrimers}/${maxPrimersNeeded} primers`,
        );

        if (bestCoverage === nTaxa) {
            console.info("achieved 100% coverage");
            if (nPrimers < maxPrimersNeeded) {
                console.info(`  => terminating early at ${nPrimers} primers`);
            }
            break;
        }
    }

    postMessage({
        type: "result",
        data: { params, results: bestPrimerCombinations.reverse() },
    } as ResultsMessage);
};

// Worker communication ------------------------------------------------------------------------------------------------

onmessage = ({ data: { type, data } }) => {
    if (type === "search") {
        console.info("starting worker job with", data);
        findBestPrimerSets(data);
    }
};
