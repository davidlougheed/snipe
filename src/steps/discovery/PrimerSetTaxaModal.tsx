import { useEffect, useMemo, useState } from "react";
import { Input, Modal, Space, Table, type TableColumnsType, Tag } from "antd";

import Primer from "../../bits/Primer";
import type { SNIPeDataset } from "../../lib/datasets";
import type { SNIPePrimerSet, SNIPeSearchParams } from "../../lib/types";

import TaxaFilterRadioSelector from "./TaxaFilterRadioSelector";
import TaxonWithGroupAndPathPopover from "./TaxonWithGroupAndPathPopover";

type TargetFilter = "onTarget" | "offTarget" | "total";

const filterTaxaTargetFactory =
    ({ onTarget, offTarget, total }: SNIPePrimerSet, targetFilter: TargetFilter) =>
    (t: string): boolean => {
        if (targetFilter === "onTarget") return onTarget.coveredTaxa.has(t);
        if (targetFilter === "offTarget") return offTarget?.coveredTaxa.has(t) ?? false;
        return total?.coveredTaxa.has(t) ?? false; // otherwise, total
    };

export type PrimerSetTaxaModalProps = {
    dataset: SNIPeDataset;
    primerSet: SNIPePrimerSet;
    resultParams: SNIPeSearchParams;
    open: boolean;
    onCancel: () => void;
};

type TaxonTableItem = {
    taxon: string;
    primers: string[];
    onTarget: boolean;
};

const PrimerSetTaxaModal = ({ dataset, primerSet, resultParams, open, onCancel }: PrimerSetTaxaModalProps) => {
    const shownTaxa = useMemo(
        () => Array.from(primerSet.total?.coveredTaxa ?? primerSet.onTarget.coveredTaxa).sort(),
        [primerSet],
    );

    const {
        id,
        primers,
        onTarget: { coveredTaxa },
    } = primerSet;

    const [taxaTargetFilter, setTaxaTargetFilter] = useState<TargetFilter>("onTarget");
    const [filteredTaxa, setFilteredTaxa] = useState<string[]>([]); // shownTaxa + filtering
    const [searchValue, setSearchValue] = useState("");

    useEffect(() => {
        const sv = searchValue.toLowerCase();
        if (sv === "") {
            setFilteredTaxa(shownTaxa.filter(filterTaxaTargetFactory(primerSet, taxaTargetFilter)));
            return;
        }
        setFilteredTaxa(
            shownTaxa
                .filter(filterTaxaTargetFactory(primerSet, taxaTargetFilter))
                .filter(
                    (t) =>
                        t.replace("_", " ").toLowerCase().includes(sv) ||
                        dataset.recordsByFinalID[t].primersLower.reduce((acc, p) => acc || p.includes(sv), false),
                ),
        );
    }, [primerSet, taxaTargetFilter, searchValue]);

    const columns = useMemo<TableColumnsType<TaxonTableItem>>(
        () => [
            {
                dataIndex: "taxon",
                render: (t) => (
                    <TaxonWithGroupAndPathPopover
                        record={dataset.recordsByFinalID[t]}
                        searchHighlight={searchValue}
                    />
                ),
            },
            {
                dataIndex: "primers",
                render: (p: string[]) =>
                    p.filter((pp) => primers.has(pp)).map((pp) => <Primer key={pp} name={pp} />),
            },
            {
                dataIndex: "onTarget",
                render: (oT) => (oT ? <Tag color="green">On-target</Tag> : <Tag color="volcano">Off-target</Tag>),
            },
        ],
        [dataset, primers, searchValue],
    );

    const dataSource = useMemo(
        () =>
            filteredTaxa.map((t) => ({
                taxon: t,
                primers: dataset.recordsByFinalID[t].primers,
                onTarget: coveredTaxa.has(t),
            })),
        [dataset, filteredTaxa, coveredTaxa],
    );

    return (
        <Modal
            open={open}
            title={`Primer pair set ${id}: ${shownTaxa.length} taxa (${filteredTaxa.length} shown)`}
            footer={null}
            width={920}
            style={{ top: 24 }}
            onCancel={onCancel}
        >
            <Space direction="vertical" style={{ width: "100%" }}>
                <Space direction="horizontal" size={16}>
                    <Input
                        placeholder="Search"
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        allowClear={true}
                    />
                    <TaxaFilterRadioSelector
                        value={taxaTargetFilter}
                        onChange={(v) => setTaxaTargetFilter(v)}
                        includeOffTargetTaxa={resultParams.includeOffTargetTaxa}
                    />
                </Space>
                <Table<TaxonTableItem>
                    size="small"
                    bordered={true}
                    showHeader={false}
                    pagination={false}
                    rowKey="taxon"
                    columns={columns}
                    dataSource={dataSource}
                />
            </Space>
        </Modal>
    );
};

export default PrimerSetTaxaModal;
