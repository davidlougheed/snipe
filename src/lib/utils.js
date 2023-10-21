export const pluralize = (word, count) => {
    if (word === "taxon") {
        if (count !== 1) return "taxa";
        return "taxon";
    }

    if (count !== 1) return `${word}s`;
    return word;
};

export const formatTaxon = (finalID) => {
    const parts = finalID.split("_");
    if (parts.length === 1) {
        // Not a latin name
        return <>{finalID}</>;
    }

    // \xa0 <=> &nbsp;
    return <em>{parts.join("\xa0")}{parts.at(-1) === "sp" ? "." : ""}</em>;
};
