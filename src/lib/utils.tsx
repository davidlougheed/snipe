import { Fragment, type ReactNode } from "react";
import { escapeRegExp } from "lodash";

export const pluralize = (word: string, count: number) => {
    if (word === "taxon") {
        if (count !== 1) return "taxa";
        return "taxon";
    }

    if (count !== 1) return `${word}s`;
    return word;
};

export const highlightTerm = (str: string, highlight?: string): ReactNode => {
    if (!highlight) return str;

    const searchParts = str.split(new RegExp(escapeRegExp(highlight), "i"));

    let acc = 0;
    return (
        <>
            {searchParts.map((part, i) => {
                if (i === searchParts.length - 1) {
                    return <Fragment key={`search-part-${i}`}>{part}</Fragment>;
                }

                // side effect: increase acc by len(part) + len(highlighted part)

                acc += part.length;
                const res = (
                    <Fragment key={`search-part-${i}`}>
                        {part}
                        <strong>{str.slice(acc, acc + highlight.length)}</strong>
                    </Fragment>
                );
                acc += highlight.length;

                return res;
            })}
        </>
    );
};

export const formatTaxon = (finalID: string, searchHighlight: string | undefined = undefined) => {
    searchHighlight = searchHighlight || undefined; // Turn "" -> undefined

    const parts = finalID.split("_");

    if (parts.length === 1) {
        // Not a latin name
        return <>{highlightTerm(finalID, searchHighlight)}</>;
    }

    return (
        <em style={{ whiteSpace: "nowrap" }}>
            {highlightTerm(parts.join(" ") + (parts.at(-1) === "sp" ? "." : ""), searchHighlight)}
        </em>
    );
};

export const serializeCSVRow = <T extends string | number>(arr: T[]) => arr.map((v) => `${v}`).join(",") + "\n";
