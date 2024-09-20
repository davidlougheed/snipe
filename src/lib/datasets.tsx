import type { MouseEventHandler, ReactNode } from "react";
import groupBy from "lodash/groupBy";
import { Popover } from "antd";
import Primer from "../bits/Primer";
import { formatTaxon } from "./utils";
import { paletteForPrimers } from "./colors";
import type { PrimerPalette } from "./types";

export const COL_PRIMER_NAME = "Primer_name";
export const COL_SUPERGROUP = "Supergroup";
export const COL_TAXA_GROUP = "Taxa_group";
export const COL_PHYLUM = "Phylum";
export const COL_ORDER = "Order";
export const COL_FAMILY = "Family";
export const COL_GENUS = "Genus";
export const COL_FINAL_ID = "Final_ID";

export const COL_RESOLUTION = "Resolution"; // Optional column; computed otherwise

export const OVERVIEW_GROUPINGS = [COL_TAXA_GROUP, COL_FINAL_ID];
export const PRIMER_GROUPINGS = [
    COL_SUPERGROUP,
    COL_TAXA_GROUP,
    COL_PHYLUM,
    COL_ORDER,
    COL_FAMILY,
    COL_GENUS,
    COL_FINAL_ID,
] as const;
const RESOLUTION_SPECIES = "Species";
export const RESOLUTIONS = PRIMER_GROUPINGS.slice(2, -1);
export const RESOLUTIONS_WITH_SPECIES = [...RESOLUTIONS, RESOLUTION_SPECIES];
export const CSV_HEADER = [...PRIMER_GROUPINGS, COL_PRIMER_NAME] as const;

type PrimerGroupingKey = (typeof PRIMER_GROUPINGS)[number];
export type BasePrimerGroupingRecord = Record<PrimerGroupingKey, string>;

export const REQUIRED_DATASET_COLUMNS = [...PRIMER_GROUPINGS, COL_PRIMER_NAME] as const;

type RequiredDatasetKey = (typeof REQUIRED_DATASET_COLUMNS)[number];

type RawLongFormDatasetRecord = Record<string, string>;
export type IntermediateLongFormDatasetRecord = Record<RequiredDatasetKey, string>;
type IntermediateLongFormDatasetRecordWithResolution = IntermediateLongFormDatasetRecord &
    Record<"Resolution", string | undefined>;
type FinalLongFormDatasetRecord = IntermediateLongFormDatasetRecord & { Resolution: string; key: string };
export type DatasetRecord = BasePrimerGroupingRecord & {
    key: string;
    primers: string[];
    primersLower: string[];
};

export interface TaxaTreeNode {
    title: ReactNode;
    key: string;
    children?: TaxaTreeNode[];
}

const mousePreventDefault: MouseEventHandler = (e) => {
    e.preventDefault();
};

const richFormatter = (key: string, recs: IntermediateLongFormDatasetRecord[]) => (
    <span>
        {formatTaxon(key)}{" "}
        <Popover
            title="Primers"
            content={recs.map((p) => (
                <Primer key={`${key}-${p[COL_PRIMER_NAME]}`} name={p[COL_PRIMER_NAME]} />
            ))}
        >
            (
            <a href="#" onClick={mousePreventDefault}>
                {recs.length} available {recs.length === 1 ? "primer" : "primers"}
            </a>
            )
        </Popover>
    </span>
);

const taxaRecGroup = <T, L extends ReactNode>(
    arr: T[],
    groupings: readonly string[],
    pathStr: string,
    leafFormatter: (key: string, recs: T[]) => L,
): TaxaTreeNode[] => {
    const res = groupBy(arr, groupings[0]);

    const isLeaf = groupings.length === 1;
    return Object.entries(res).map(([k, v]) => {
        const fullKey = `${pathStr}-${k}${isLeaf ? "-leaf" : ""}`; // Special suffix to make leaves easy to ID

        if (k === "" && !isLeaf) {
            // If this key is blank, it'll be blank from hereon out until the final (thus only one child) - skip it.
            return taxaRecGroup<T, L>(v, groupings.slice(1), fullKey, leafFormatter)[0];
        }

        const record: TaxaTreeNode = {
            title: isLeaf ? leafFormatter(k, v) : k,
            key: fullKey,
        };

        if (!isLeaf) {
            record.children = taxaRecGroup(v, groupings.slice(1), fullKey, leafFormatter);
        }

        return record;
    });
};

export const taxaGroup = (records: DatasetRecord[], groupings: readonly string[]): TaxaTreeNode[] =>
    taxaRecGroup(records, groupings, "root", (k, _) => k);

export const taxaGroupRich = (
    records: IntermediateLongFormDatasetRecord[],
    groupings: readonly string[],
): TaxaTreeNode[] => taxaRecGroup(records, groupings, "root", richFormatter);

const buildRecordsWithPrimerArrays = (records: FinalLongFormDatasetRecord[]): DatasetRecord[] => {
    return Object.entries(groupBy(records, COL_FINAL_ID)).map(([_, recs]) => {
        const recPrimers = recs.map((rec) => rec[COL_PRIMER_NAME]);
        return {
            ...Object.fromEntries(Object.entries(recs[0]).filter((e) => e[0] !== COL_PRIMER_NAME)),
            primers: recPrimers,
            primersLower: recPrimers.map((p) => p.toLowerCase()),
        } as DatasetRecord;
    });
};

const buildLeafKey = (rec: IntermediateLongFormDatasetRecordWithResolution) =>
    `root-${PRIMER_GROUPINGS.map((g) => rec[g]).join("-")}-leaf`;

const validateRecord = (rec: RawLongFormDatasetRecord): void => {
    const missingColumns: string[] = [];
    REQUIRED_DATASET_COLUMNS.forEach((rc) => {
        if (!(rc in rec)) {
            console.log(rec);
            missingColumns.push(rc);
        }
    });
    if (missingColumns.length) {
        throw new Error(`Missing columns in the dataset CSV: '${missingColumns.join("', '")}'`);
    }
};

export type SNIPeDataset = {
    tree: TaxaTreeNode[];
    primers: string[];
    primerPalette: PrimerPalette;
    records: DatasetRecord[];
    recordsByKey: Record<string, DatasetRecord>;
    recordsByFinalID: Record<string, DatasetRecord>;
    supergroups: string[];
    supergroupGroups: Record<string, string[]>;
};

export const createDataset = (rawRecords: RawLongFormDatasetRecord[]): SNIPeDataset => {
    const longFormRecords = rawRecords.map((rec: RawLongFormDatasetRecord) => {
        // Validate input entry
        validateRecord(rec);

        const newRec = { ...rec } as IntermediateLongFormDatasetRecordWithResolution;

        // Trim primer names
        newRec[COL_PRIMER_NAME] = newRec[COL_PRIMER_NAME].trim();

        // Make sure we trim whitespace off of each grouping field to avoid accidental duplicate entries.
        PRIMER_GROUPINGS.forEach((g) => {
            newRec[g] = (newRec[g] || "").trim();
        });

        // Additionally normalize the Final_ID column by replacing spaces with underscores.
        newRec[COL_FINAL_ID] = newRec[COL_FINAL_ID].replace(" ", "_");

        return {
            ...newRec,
            // Add a new column if it isn't already provided: "Resolution", which we can use for generating a breakdown
            // of primer resolution in results.
            [COL_RESOLUTION]:
                newRec[COL_RESOLUTION] ?? RESOLUTIONS.find((g) => newRec[g] === "") ?? RESOLUTION_SPECIES,
            key: buildLeafKey(newRec),
        } as FinalLongFormDatasetRecord;
    });

    const tree = taxaGroupRich(longFormRecords, PRIMER_GROUPINGS);
    const primers = new Set(longFormRecords.map((rec) => rec[COL_PRIMER_NAME]));
    const processedRecords = buildRecordsWithPrimerArrays(longFormRecords);

    const supergroups = [...new Set(longFormRecords.map((rec) => rec[COL_SUPERGROUP]))].sort();
    const supergroupGroups = Object.fromEntries(
        Object.entries(groupBy(longFormRecords, COL_SUPERGROUP)).map(([sg, recs]) => [
            sg,
            [...new Set(recs.map((rec) => rec[COL_TAXA_GROUP]))].sort(),
        ]),
    );

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
