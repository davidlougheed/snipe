import groupBy from "lodash/groupBy";
import { Popover } from "antd";

export const PRIMER_GROUPINGS = ["Taxa_group", "Phylum", "Order", "Family", "Genus", "Final_ID"];

const preventDefault = (e) => {
    e.preventDefault();
};

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
            title: isSpeciesLevel ? <span>
                <em>{k.split("_").join(" ")}</em>{" "}
                <Popover title="Primers" content={<ul style={{ margin: 0, paddingLeft: "1em" }}>
                    {v.map(p => <li key={`${k}-${p["Primer_name"]}`} style={{ fontFamily: "monospace" }}>
                        {p["Primer_name"]}
                    </li>)}
                </ul>}>
                    (<a href="#" onClick={preventDefault}>
                        {v.length} available {v.length === 1 ? "primer" : "primers"}
                    </a>)
                </Popover>
            </span> : k,
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
};

const buildLeafKey = (rec) => `root-${PRIMER_GROUPINGS.map((g) => rec[g]).join("-")}-leaf`;

export const createDataset = (records) => {
    const tree = taxaRecGroup(records, PRIMER_GROUPINGS, "root");
    const primers = new Set(records.map((x) => x["Primer_name"]));
    const recordsWithKey = records.map((rec) => ({ ...rec, key: buildLeafKey(rec) }));
    return {
        tree,
        primers: Array.from(primers),
        records: recordsWithKey,
        recordsByKey: Object.fromEntries(recordsWithKey.map((rec) => [rec.key, rec])),
    };
};
