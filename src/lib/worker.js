// Helpers -------------------------------------------------------------------------------------------------------------

// Inspired by https://stackoverflow.com/a/64414875
const chooseRec = (arr, k, prefix) =>
    k === 0
        ? prefix  // Base case: return existing combination
        : arr.flatMap((v, i) => chooseRec(arr.slice(i + 1), k - 1, [...prefix, v]));
export const choose = (arr, k) => chooseRec(arr, k, []);


// Processing ----------------------------------------------------------------------------------------------------------

const findBestPrimerSets = (records, maxPrimers) => {
    // Subset of primers which can be used to identify
    const primerSubset = Array.from(new Set(records.map((rec) => rec["Primer_name"])));
    // - This is the largest possible set of primers we'll need, but fewer may be sufficient.
    const maxPrimersNeeded = Math.min(maxPrimers, primerSubset.length);

    for (let nPrimers = 1; nPrimers <= maxPrimersNeeded; nPrimers++) {
        console.info(`trying ${nPrimers}/${maxPrimersNeeded} for ${records.length} records`);
        const primerCombinations = choose(primerSubset, nPrimers);

        // TODO

        postMessage({
            type: "progress",
            nPrimers,
            // TODO
        });

        console.info(
            `processed ${primerCombinations.length} combinations for ${nPrimers}/${maxPrimersNeeded} primers`);
    }

    postMessage({
        type: "result",
        // TODO
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
