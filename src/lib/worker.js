import { asSets } from "@upsetjs/react";
import { hsl, rgb } from "d3-color";

// Helpers -------------------------------------------------------------------------------------------------------------

// Inspired by https://stackoverflow.com/a/64414875
const chooseRec = (arr, k, prefix) =>
    k === 0
        ? [prefix]  // Base case: return existing combination
        : arr.flatMap((v, i) => chooseRec(arr.slice(i + 1), k - 1, [...prefix, v]));
const choose = (arr, k) => chooseRec(arr, k, []).map((c) => new Set(c));


// Processing ----------------------------------------------------------------------------------------------------------

const findBestPrimerSets = (records, maxPrimers, primerPalette) => {
    // All taxon IDs, deduplicated
    const allTaxa = new Set(records.map((rec) => rec["Final_ID"]));

    // Subset of primers which can be used to identify
    const primerSubset = Array.from(new Set(records.flatMap((rec) => rec.primers)));
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

        console.info(`trying ${nPrimers}/${maxPrimersNeeded} for ${records.length} records`);

        let bestCoverage = 0;
        let bestResultsForPrimerCount = [];

        primerCombinations.forEach((pc) => {
            const coveredTaxa = new Set();
            const coveredTaxaByPrimer = {};

            records.forEach((rec) => {
                const finalID = rec["Final_ID"];

                if (coveredTaxa.has(finalID)) {
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
                }
            });

            const coverage = coveredTaxa.size / allTaxa.size;

            const res = {
                primers: pc,
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
            };

            if (coverage > bestCoverage) {
                bestCoverage = coverage;
                bestResultsForPrimerCount = [res];
            } else if (coverage === bestCoverage) {
                bestResultsForPrimerCount.push(res);
            }
            // Otherwise, discard

            nTriedPrimerCombinations += 1;

            if (nTriedPrimerCombinations % 1000 === 0) {
                sendProgress(nPrimers);
            }
        });

        bestPrimerCombinations.push({
            nPrimers,
            coverage: bestCoverage,
            results: bestResultsForPrimerCount,
        });

        console.log(
            `best primer combinations: coverage=${(bestCoverage * 100).toFixed(1)}`,
            bestResultsForPrimerCount);

        sendProgress(nPrimers);

        console.info(
            `processed ${primerCombinations.length} combinations for ${nPrimers}/${maxPrimersNeeded} primers`);

        if (bestCoverage === 1) {
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
        const { records, maxPrimers, primerPalette } = data;
        console.info("starting worker job with", data);
        findBestPrimerSets(records, maxPrimers, primerPalette);
    }
};
