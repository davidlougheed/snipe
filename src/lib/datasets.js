import groupBy from "lodash/groupBy";

export const PRIMER_GROUPINGS = ["Taxa_group", "Phylum", "Order", "Family", "Genus", "Final_ID"];

const taxaRecGroup = (arr, groupings, pathStr) => {
    const res = groupBy(arr, groupings[0]);

    const remainingGroupings = groupings.slice(1);
    const isSpeciesLevel = remainingGroupings.length === 0;
    return Object.entries(res).map(([k, v]) => {
        const fullKey = `${pathStr}-${k}`;

        if (k === "") {
            // If this key is blank, it'll be blank from hereon out until the final (thus only one child) - skip it.
            return taxaRecGroup(v, remainingGroupings, fullKey)[0];
        }

        const baseRecord = {
            title: isSpeciesLevel ? <em>{k.split("_").join(" ")}</em> : k,
            key: fullKey,
        };

        if (isSpeciesLevel) {  // No children, return as-is
            return { ...baseRecord, key: `${fullKey}-leaf` };
        }

        const children = taxaRecGroup(v, remainingGroupings, fullKey);

        return {
            ...baseRecord,
            // If it's Chordata, it's because we've divided the phylum into multiple 'taxa groups'
            //  -> so we just skip Chordata
            children: children[0]?.title === "Chordata" ? children[0]?.children : children,
        };
    });
}

export const createDataset = (objs) => {
    const tree = taxaRecGroup(objs, PRIMER_GROUPINGS, "root");
    const primers = new Set(objs.map((x) => x["Primer_name"]));
    return { tree, primers: Array.from(primers), nTaxa: objs.length };
};
