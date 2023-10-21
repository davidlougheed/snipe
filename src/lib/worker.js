// Helpers -------------------------------------------------------------------------------------------------------------

// Inspired by https://stackoverflow.com/a/64414875
const chooseRec = (arr, k, prefix) =>
    k === 0
        ? [prefix]  // Base case: return existing combination
        : arr.flatMap((v, i) => chooseRec(arr.slice(i + 1), k - 1, [...prefix, v]));
export const choose = (arr, k) => chooseRec(arr, k, []).map((c) => new Set(c));


// Processing ----------------------------------------------------------------------------------------------------------

const findBestPrimerSets = (records, maxPrimers) => {
    // Subset of primers which can be used to identify
    const primerSubset = Array.from(new Set(records.map((rec) => rec["Primer_name"])));
    // - This is the largest possible set of primers we'll need, but fewer may be sufficient.
    const maxPrimersNeeded = Math.min(maxPrimers, primerSubset.length);

    const bestPrimerCombinations = [];  // array-indexed by (nPrimers - 1)

    for (let nPrimers = 1; nPrimers <= maxPrimersNeeded; nPrimers++) {
        console.info(`trying ${nPrimers}/${maxPrimersNeeded} for ${records.length} records`);
        const primerCombinations = choose(primerSubset, nPrimers);

        let bestCoverage = 0;
        let bestResultsForPrimerCount = [];

        primerCombinations.forEach((pc) => {
            const coveredTaxa = new Set();

            records.forEach((rec) => {
                const finalID = rec["Final_ID"];

                if (coveredTaxa.has(finalID)) {
                    return;
                }
                if (pc.has(rec["Primer_name"])) {
                    coveredTaxa.add(finalID);
                }
            });

            const coverage = coveredTaxa.size / records.length;

            if (coverage > bestCoverage) {
                bestCoverage = coverage;
                bestResultsForPrimerCount = [{ primers: pc, coveredTaxa }];
            } else if (coverage === bestCoverage) {
                bestResultsForPrimerCount.push({ primers: pc, coveredTaxa });
            }
            // Otherwise, discard

            console.debug("primer combination:", pc, `coverage: ${(coverage * 100).toFixed(1)}%`);
        });

        bestPrimerCombinations.push({
            coverage: bestCoverage,
            results: bestResultsForPrimerCount,
        });

        console.log(
            `best primer combinations: coverage=${(bestCoverage * 100).toFixed(1)}`,
            bestResultsForPrimerCount);

        postMessage({
            type: "progress",
            data: { nPrimers },
            // TODO
        });

        console.info(
            `processed ${primerCombinations.length} combinations for ${nPrimers}/${maxPrimersNeeded} primers`);
    }

    postMessage({
        type: "result",
        data: { results: bestPrimerCombinations },
    });
};


// Worker communication ------------------------------------------------------------------------------------------------

onmessage = ({ data: { type, data } }) => {
    if (type === "search") {
        const { records, maxPrimers } = data;
        console.info("starting worker job with", data);
        findBestPrimerSets(records, maxPrimers);
    }
};