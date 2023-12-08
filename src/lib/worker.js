import { asSets } from "@upsetjs/react";
import groupBy from "lodash/groupBy";
import { rgb } from "d3-color";
import { OVERVIEW_GROUPINGS, taxaGroup } from "./datasets";

// Helpers -------------------------------------------------------------------------------------------------------------

// Inspired by https://stackoverflow.com/a/64414875
const chooseRec = (arr, k, prefix) =>
    k === 0
        ? [prefix]  // Base case: return existing combination
        : arr.flatMap((v, i) => chooseRec(arr.slice(i + 1), k - 1, [...prefix, v]));
const choose = (arr, k) => chooseRec(arr, k, []).map((c) => new Set(c));


// Processing ----------------------------------------------------------------------------------------------------------

const PROGRESS_EVERY_N = 500;

const calculateGroupCoverage = (tree) =>
    Object.fromEntries(tree.map((g) => [g.title, g.children.length]));

const findBestPrimerSets = ({ selectedRecords, allRecords, maxPrimers, includeOffTarget, primerPalette }) => {
    // Make records index-able by final ID - this way we can find, e.g., groups from final IDs
    const nTaxa = selectedRecords.length;

    // Subset of primers which can be used to identify
    const primerSubset = Array.from(new Set(selectedRecords.flatMap((rec) => rec.primers)));
    // - This is the largest possible set of primers we'll need, but fewer may be sufficient.
    const maxPrimersNeeded = Math.min(maxPrimers, primerSubset.length);

    const bestPrimerCombinations = [];  // array-indexed by (nPrimers - 1)

    const allPrimerCombinations = [];

    for (let np = 1; np <= maxPrimersNeeded; np++) {
        allPrimerCombinations.push(choose(primerSubset, np));
    }

    let nTriedPrimerCombinations = 0;
    const nTotalPrimerCombinations = allPrimerCombinations.flat().length;

    const sendProgress = (nPrimers) => {
        postMessage({
            type: "progress",
            data: { nPrimers, percent: (nTriedPrimerCombinations / nTotalPrimerCombinations) * 100 },
        });
    };

    for (let nPrimers = 1; nPrimers <= maxPrimersNeeded; nPrimers++) {
        const primerCombinations = allPrimerCombinations[nPrimers - 1];

        console.info(`trying ${nPrimers}/${maxPrimersNeeded} for ${selectedRecords.length} records`);

        let bestCoverage = 0;
        let bestResultsForPrimerCount = [];

        primerCombinations.forEach((pc) => {
            const coveredTaxa = new Set();
            const coveredTaxaByPrimer = {};
            const coveredRecords = [];

            selectedRecords.forEach((rec) => {
                const finalID = rec["Final_ID"];

                if (coveredTaxa.has(finalID)) {
                    // TODO: I think this was an artifact from when we had accidentally duplicate records, this should
                    //  never happen in practice.
                    coveredRecords.push(rec);
                    return;
                }

                const intersect = rec.primers.filter((p) => pc.has(p));

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

            const coverage = coveredTaxa.size;

            const res = {
                primers: pc,
                coverage,
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
                    })
                ),
                coverageByGroup: calculateGroupCoverage(
                    taxaGroup(coveredRecords, OVERVIEW_GROUPINGS, false)),
                resolutionSummary: Object.fromEntries(
                    Object.entries(groupBy(coveredRecords, "Resolution")).map(([k, v]) => [k, v.length])),
            };

            if (coverage > bestCoverage) {
                bestCoverage = coverage;
                bestResultsForPrimerCount = [res];
            } else if (coverage === bestCoverage) {
                bestResultsForPrimerCount.push(res);
            }
            // Otherwise, discard

            nTriedPrimerCombinations += 1;

            if (nTriedPrimerCombinations % PROGRESS_EVERY_N === 0) {
                sendProgress(nPrimers);
            }
        });

        const bestCoverageFraction = bestCoverage / nTaxa;

        const baseCoverageByGroup = Object.fromEntries(selectedRecords.map((rec) => [rec["Taxa_group"], 0]));
        const avgCoverageByGroup = Object.fromEntries(
            Object.entries(
                bestResultsForPrimerCount.reduce((acc, res) => {
                    Object.entries(res.coverageByGroup).forEach(([g, v]) => { acc[g] += v });
                    return acc;
                }, baseCoverageByGroup)
            ).map(([g, v]) => [g, v / bestResultsForPrimerCount.length])
        );

        console.info(`calculated average coverage by group:`, avgCoverageByGroup);

        bestPrimerCombinations.push({
            nPrimers,
            coverage: bestCoverage,
            coverageFraction: bestCoverageFraction,
            results: bestResultsForPrimerCount,
            avgCoverageByGroup,
        });

        console.info(
            `best primer combinations: coverage=${(bestCoverageFraction * 100).toFixed(1)}`,
            bestResultsForPrimerCount);

        sendProgress(nPrimers);

        console.info(
            `processed ${primerCombinations.length} combinations for ${nPrimers}/${maxPrimersNeeded} primers`);

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
        data: { results: bestPrimerCombinations.reverse() },
    });
};


// Worker communication ------------------------------------------------------------------------------------------------

onmessage = ({ data: { type, data } }) => {
    if (type === "search") {
        console.info("starting worker job with", data);
        findBestPrimerSets(data);
    }
};
