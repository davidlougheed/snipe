import { memo } from "react";
import { Popover } from "antd";
import { COL_FINAL_ID, COL_TAXA_GROUP, type DatasetRecord, PRIMER_GROUPINGS } from "@lib/datasets";
import { formatTaxon } from "@lib/utils";

const formatRecordPath = (rec: DatasetRecord) => (
    <>
        {PRIMER_GROUPINGS.slice(1, -1)
            .map((pg) => (rec[pg] ?? "").trim())
            .filter((val) => val !== "")
            .join(" › ")}{" "}
        › {formatTaxon(rec[COL_FINAL_ID])} ({rec[COL_TAXA_GROUP]})
    </>
);

export type TaxonWithGroupAndPathPopoverProps = {
    record: DatasetRecord;
    searchHighlight?: string;
};

const TaxonWithGroupAndPathPopover = memo(({ record, searchHighlight }: TaxonWithGroupAndPathPopoverProps) => (
    <Popover trigger="click" content={formatRecordPath(record)}>
        <span style={{ textDecoration: "underline", cursor: "pointer" }}>
            {formatTaxon(record[COL_FINAL_ID], searchHighlight)}
        </span>
        &nbsp;({record[COL_TAXA_GROUP]})
    </Popover>
));

export default TaxonWithGroupAndPathPopover;
