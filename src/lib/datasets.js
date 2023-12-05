import groupBy from "lodash/groupBy";
import { Popover } from "antd";
import Primer from "../bits/Primer";
import { formatTaxon } from "./utils";
import { paletteForPrimers } from "../colors";

export const OVERVIEW_GROUPINGS = ["Taxa_group", "Final_ID"];
export const PRIMER_GROUPINGS = ["Supergroup", "Taxa_group", "Phylum", "Order", "Family", "Genus", "Final_ID"];

const preventDefault = (e) => {
    e.preventDefault();
};

const taxaRecGroup = (arr, groupings, pathStr, reactMode) => {
    const res = groupBy(arr, groupings[0]);

    const isLeaf = groupings.length === 1;
    return Object.entries(res).map(([k, v]) => {
        const fullKey = `${pathStr}-${k}${isLeaf ? "-leaf" : ""}`;  // Special suffix to make leaves easy to ID

        if (k === "" && !isLeaf) {
            // If this key is blank, it'll be blank from hereon out until the final (thus only one child) - skip it.
            return taxaRecGroup(v, groupings.slice(1), fullKey, reactMode)[0];
        }

        const record = {
            title: (isLeaf && reactMode) ? <span>
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

        if (!isLeaf) {
            record.children = taxaRecGroup(v, groupings.slice(1), fullKey, reactMode);
        }

        return record;
    });
};

export const taxaGroup = (records, groupings, reactMode) => taxaRecGroup(records, groupings, "root", reactMode);

const buildRecordsWithPrimerArrays = (records) => {
    return Object.entries(groupBy(records, "Final_ID")).map(([_, recs]) => {
        const recPrimers = recs.map((rec) => rec["Primer_name"]);
        return {
            ...Object.fromEntries(Object.entries(recs[0]).filter((e) => e[0] !== "Primer_name")),
            primers: recPrimers,
            primersLower: recPrimers.map((p) => p.toLowerCase()),
        };
    });
};

const buildLeafKey = (rec) => `root-${PRIMER_GROUPINGS.map((g) => rec[g]).join("-")}-leaf`;

export const createDataset = (rawRecords) => {
    const records = rawRecords.map((rec) => {
        const newRec = {...rec};

        // Trim primer names
        newRec["Primer_name"] = newRec["Primer_name"].trim();

        // Make sure we trim whitespace off of each grouping field to avoid accidental duplicate entries
        PRIMER_GROUPINGS.forEach((g) => {
            newRec[g] = (newRec[g] || "").trim();
        });

        // Additionally normalize the Final_ID column by replacing spaces with underscores
        newRec["Final_ID"] = newRec["Final_ID"].replace(" ", "_");

        return newRec;
    });

    const tree = taxaGroup(records, PRIMER_GROUPINGS, true);
    const primers = new Set(records.map((rec) => rec["Primer_name"]));
    const processedRecords = buildRecordsWithPrimerArrays(records.map((rec) => ({ ...rec, key: buildLeafKey(rec) })));

    const supergroups = [...new Set(records.map((rec) => rec["Supergroup"]))].sort();
    const supergroupGroups = Object.fromEntries(
        Object.entries(groupBy(records, "Supergroup"))
            .map(([sg, recs]) => [sg, [...new Set(recs.map((rec) => rec["Taxa_group"]))].sort()]));

    const primersArray = Array.from(primers);
    return {
        tree,
        primers: primersArray,
        primerPalette: paletteForPrimers(primersArray),
        records: processedRecords,
        recordsByKey: Object.fromEntries(processedRecords.map((rec) => [rec.key, rec])),
        recordsByFinalID: Object.fromEntries(processedRecords.map((rec) => [rec["Final_ID"], rec])),
        // summary collections:
        supergroups,
        supergroupGroups,
    };
};
