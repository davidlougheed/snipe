import groupBy from "lodash/groupBy";
import { Popover } from "antd";
import Primer from "../bits/Primer";
import { formatTaxon } from "./utils";

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
                {formatTaxon(k)}{" "}
                <Popover title="Primers" content={
                    v.map(p => <Primer key={`${k}-${p["Primer_name"]}`} name={p["Primer_name"]} />)
                }>
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

const buildRecordsWithPrimerArrays = (records) => {
    return Object.entries(groupBy(records, "Final_ID")).map(([_, recs]) => {
        const recPrimers = recs.map((rec) => rec["Primer_name"]);
        return {
            ...Object.fromEntries(Object.entries(recs[0]).filter((e) => e[0] !== "Primer_name")),
            primers: recPrimers,
        };
    });
};

const buildLeafKey = (rec) => `root-${PRIMER_GROUPINGS.map((g) => rec[g]).join("-")}-leaf`;

export const createDataset = (records) => {
    const tree = taxaRecGroup(records, PRIMER_GROUPINGS, "root");
    const primers = new Set(records.map((rec) => rec["Primer_name"]));
    const processedRecords = buildRecordsWithPrimerArrays(records.map((rec) => ({ ...rec, key: buildLeafKey(rec) })));
    const recordsByKey = Object.fromEntries(processedRecords.map((rec) => [rec.key, rec]));

    return {
        tree,
        primers: Array.from(primers),
        records: processedRecords,
        recordsByKey,
        recordsByFinalID: Object.fromEntries(processedRecords.map((rec) => [rec["Final_ID"], rec])),
    };
};
