import { Fragment } from "react";
import { escapeRegExp } from "lodash/string";

export const pluralize = (word, count) => {
    if (word === "taxon") {
        if (count !== 1) return "taxa";
        return "taxon";
    }

    if (count !== 1) return `${word}s`;
    return word;
};

export const highlightTerm = (str, highlight) => {
    if (!highlight) return str;

    const searchParts = str.split(new RegExp(escapeRegExp(highlight), "i"));

    let acc = 0;
    return <>
        {searchParts.map((part, i) => {
            if (i === searchParts.length - 1) {
                return <>{part}</>;
            }

            // side effect: increase acc by len(part) + len(highlighted part)

            acc += part.length;
            const res = <Fragment key={i}>
                {part}
                <strong>{str.slice(acc, acc + highlight.length)}</strong>
            </Fragment>;
            acc += highlight.length;

            return res;
        })}
    </>;
};

export const formatTaxon = (finalID, searchHighlight=undefined) => {
    searchHighlight = searchHighlight || undefined;  // Turn "" -> undefined

    const parts = finalID.split("_");

    if (parts.length === 1) {
        // Not a latin name
        return <>{highlightTerm(finalID, searchHighlight)}</>;
    }

    return <em style={{ whiteSpace: "nowrap" }}>
        {highlightTerm(parts.join(" ") + (parts.at(-1) === "sp" ? "." : ""), searchHighlight)}
    </em>;
};
