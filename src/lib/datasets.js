import groupBy from "lodash/groupBy";
import { Popover } from "antd";
import Primer from "../bits/Primer";
import { formatTaxon } from "./utils";
import { paletteForPrimers } from "../colors";

export const COL_PRIMER_NAME = "Primer_name";
export const COL_SUPERGROUP = "Supergroup";
export const COL_TAXA_GROUP = "Taxa_group";
export const COL_PHYLUM = "Phylum";
export const COL_ORDER = "Order";
export const COL_FAMILY = "Family";
export const COL_GENUS = "Genus";
export const COL_FINAL_ID = "Final_ID";

export const COL_RESOLUTION = "Resolution";  // Optional column; computed otherwise

export const OVERVIEW_GROUPINGS = [COL_TAXA_GROUP, COL_FINAL_ID];
export const PRIMER_GROUPINGS = [
    COL_SUPERGROUP, COL_TAXA_GROUP, COL_PHYLUM, COL_ORDER, COL_FAMILY, COL_GENUS, COL_FINAL_ID
];
const RESOLUTION_SPECIES = "Species";
export const RESOLUTIONS = PRIMER_GROUPINGS.slice(2, -1);
export const RESOLUTIONS_WITH_SPECIES = [...RESOLUTIONS, RESOLUTION_SPECIES];
export const CSV_HEADER = [...PRIMER_GROUPINGS, "Primer"];

const REQUIRED_DATASET_COLUMNS = [...PRIMER_GROUPINGS, COL_PRIMER_NAME];

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
                    v.map(p => <Primer key={`${k}-${p[COL_PRIMER_NAME]}`} name={p[COL_PRIMER_NAME]} />)
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
    return Object.entries(groupBy(records, COL_FINAL_ID)).map(([_, recs]) => {
        const recPrimers = recs.map((rec) => rec[COL_PRIMER_NAME]);
        return {
            ...Object.fromEntries(Object.entries(recs[0]).filter((e) => e[0] !== COL_PRIMER_NAME)),
            primers: recPrimers,
            primersLower: recPrimers.map((p) => p.toLowerCase()),
        };
    });
};

const buildLeafKey = (rec) => `root-${PRIMER_GROUPINGS.map((g) => rec[g]).join("-")}-leaf`;

const validateRecord = (rec) => {
    const missingColumns = [];
    REQUIRED_DATASET_COLUMNS.forEach((rc) => {
        if (!(rc in rec)) {
            console.log(rec);
            missingColumns.push(rc);
            throw new Error(`"${rc}" must be a column in the dataset CSV`);
        }
    });
    if (missingColumns.length) {
        throw new Error(`Missing columns in the dataset CSV: ${missingColumns.join(", ")}`);
    }
};

export const createDataset = (rawRecords) => {
    const records = rawRecords.map((rec) => {
        const newRec = {...rec};

        // Validate input entry
        validateRecord(newRec);

        // Trim primer names
        newRec[COL_PRIMER_NAME] = newRec[COL_PRIMER_NAME].trim();

        // Make sure we trim whitespace off of each grouping field to avoid accidental duplicate entries.
        PRIMER_GROUPINGS.forEach((g) => {
            newRec[g] = (newRec[g] || "").trim();
        });

        // Additionally normalize the Final_ID column by replacing spaces with underscores.
        newRec[COL_FINAL_ID] = newRec[COL_FINAL_ID].replace(" ", "_");

        // Add a new column if it isn't already provided: "Resolution", which we can use for generating a breakdown of
        // primer resolution in results.
        newRec[COL_RESOLUTION] = (
            newRec[COL_RESOLUTION] ??
            RESOLUTIONS.find((g) => newRec[g] === "") ??
            RESOLUTION_SPECIES
        );

        return newRec;
    });

    const tree = taxaGroup(records, PRIMER_GROUPINGS, true);
    const primers = new Set(records.map((rec) => rec[COL_PRIMER_NAME]));
    const processedRecords = buildRecordsWithPrimerArrays(records.map((rec) => ({ ...rec, key: buildLeafKey(rec) })));

    const supergroups = [...new Set(records.map((rec) => rec[COL_SUPERGROUP]))].sort();
    const supergroupGroups = Object.fromEntries(
        Object.entries(groupBy(records, COL_SUPERGROUP))
            .map(([sg, recs]) => [sg, [...new Set(recs.map((rec) => rec[COL_TAXA_GROUP]))].sort()]));

    const primersArray = Array.from(primers);
    return {
        tree,
        primers: primersArray,
        primerPalette: paletteForPrimers(primersArray),
        records: processedRecords,
        recordsByKey: Object.fromEntries(processedRecords.map((rec) => [rec.key, rec])),
        recordsByFinalID: Object.fromEntries(processedRecords.map((rec) => [rec[COL_FINAL_ID], rec])),
        // summary collections:
        supergroups,
        supergroupGroups,
    };
};
