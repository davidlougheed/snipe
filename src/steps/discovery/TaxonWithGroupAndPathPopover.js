import { memo } from "react";
import { Popover } from "antd";
import { PRIMER_GROUPINGS } from "../../lib/datasets";
import { formatTaxon } from "../../lib/utils";

const formatRecordPath = (rec) => (
    <>
        {PRIMER_GROUPINGS
            .slice(1, -1)
            .map((pg) => (rec[pg] ?? "").trim())
            .filter((val) => val !== "")
            .join(" › ")} ›{" "}
        {formatTaxon(rec["Final_ID"])} ({rec["Taxa_group"]})
    </>
);

const TaxonWithGroupAndPathPopover = memo(({ record, searchHighlight }) => (
    <Popover trigger="click" content={formatRecordPath(record)}>
        <span style={{ textDecoration: "underline", cursor: "pointer" }}>
            {formatTaxon(record["Final_ID"], searchHighlight)}
        </span>&nbsp;({record["Taxa_group"]})
    </Popover>
));

export default TaxonWithGroupAndPathPopover;
