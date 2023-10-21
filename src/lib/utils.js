export const pluralize = (word, count) => {
    if (word === "taxon") {
        if (count !== 1) return "taxa";
        return "taxon";
    }

    if (count !== 1) return `${word}s`;
    return word;
};
