import { useEffect, useMemo, useState } from "react";

import { Input, Modal, Space, Table, type TableColumnsType, Tag } from "antd";
import { ColumnsType } from "antd/es/table";

import Primer from "../../bits/Primer";
import type { SNIPeDataset } from "../../lib/datasets";
import type { SNIPePrimerSet, SNIPeSearchParams } from "../../lib/types";

import TaxonWithGroupAndPathPopover from "./TaxonWithGroupAndPathPopover";
import TaxaFilterRadioSelector from "./TaxaFilterRadioSelector";

type TargetFilter = "onTarget" | "offTarget" | "total";

const filterTaxaTargetFactory =
    ({ onTarget, offTarget, total }: SNIPePrimerSet, targetFilter: TargetFilter) =>
    (t: string): boolean => {
        if (targetFilter === "onTarget") return onTarget.coveredTaxa.has(t);
        if (targetFilter === "offTarget") return offTarget?.coveredTaxa.has(t) ?? false;
        return total?.coveredTaxa.has(t) ?? false; // otherwise, total
    };

type TaxaModalProps = {
    dataset: SNIPeDataset;
    result?: {
        primerSet: SNIPePrimerSet;
        resultParams: SNIPeSearchParams;
    };
    open: boolean;
    onCancel: () => void;
};

type TaxonTableItem = {
    taxon: string;
    primers: string[];
    onTarget: boolean;
};

const TaxaModal = ({ dataset, result, open, onCancel }: TaxaModalProps) => {
    const primerSet = result?.primerSet;

    const shownTaxa = useMemo(
        () =>
            primerSet
                ? Array.from(primerSet.total?.coveredTaxa ?? primerSet.onTarget.coveredTaxa).sort()
                : Object.keys(dataset.recordsByFinalID),
        [primerSet],
    );

    const primers = primerSet ? primerSet.primers : new Set(dataset.primers);

    const [taxaTargetFilter, setTaxaTargetFilter] = useState<TargetFilter>("onTarget");
    const [filteredTaxa, setFilteredTaxa] = useState<string[]>([]); // shownTaxa + filtering
    const [searchValue, setSearchValue] = useState("");

    useEffect(() => {
        const sv = searchValue.toLowerCase();
        if (sv === "") {
            setFilteredTaxa(
                primerSet ? shownTaxa.filter(filterTaxaTargetFactory(primerSet, taxaTargetFilter)) : shownTaxa,
            );
            return;
        }

        let newFilteredTaxa: string[] = shownTaxa;
        if (primerSet) {
            newFilteredTaxa = newFilteredTaxa.filter(filterTaxaTargetFactory(primerSet, taxaTargetFilter));
        }
        setFilteredTaxa(
            newFilteredTaxa.filter(
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
            ...(primerSet
                ? ([
                      {
                          dataIndex: "onTarget",
                          render: (oT: boolean) =>
                              oT ? <Tag color="green">On-target</Tag> : <Tag color="volcano">Off-target</Tag>,
                      },
                  ] as ColumnsType<TaxonTableItem>)
                : []),
        ],
        [dataset, primers, searchValue],
    );

    const dataSource = useMemo(
        () =>
            filteredTaxa.map((t) => ({
                taxon: t,
                primers: dataset.recordsByFinalID[t].primers,
                onTarget: primerSet ? primerSet.onTarget.coveredTaxa.has(t) : true,
            })),
        [dataset, filteredTaxa, primerSet],
    );

    const shownTitle = `${shownTaxa.length} taxa (${filteredTaxa.length} shown)`;

    return (
        <Modal
            open={open}
            title={result ? `Primer pair set ${result.primerSet.id}: ${shownTitle}` : shownTitle}
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
                    {!!result && (
                        <TaxaFilterRadioSelector
                            value={taxaTargetFilter}
                            onChange={(v) => setTaxaTargetFilter(v)}
                            includeOffTargetTaxa={result.resultParams.includeOffTargetTaxa}
                        />
                    )}
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

export default TaxaModal;
