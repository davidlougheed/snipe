import { useEffect, useMemo, useState } from "react";
import { Input, Modal, Space, Table, Tag } from "antd";

import TaxaFilterRadioSelector from "./TaxaFilterRadioSelector";
import TaxonWithGroupAndPathPopover from "./TaxonWithGroupAndPathPopover";
import Primer from "../../bits/Primer";

const filterTaxaTargetFactory = ({ coveredTaxa, offTarget, total }, targetFilter) => (t) => {
    if (targetFilter === "onTarget") return coveredTaxa.has(t);
    if (targetFilter === "offTarget") return offTarget.coveredTaxa.has(t);
    return total.coveredTaxa.has(t);  // otherwise, total
};

const TaxaModal = ({ dataset, primerSet, resultParams, open, onCancel }) => {
    const shownTaxa = useMemo(() => (
        Array.from(primerSet.total?.coveredTaxa ?? primerSet.coveredTaxa).sort()
    ), [primerSet]);

    const { id, primers, coveredTaxa } = primerSet;

    const [taxaTargetFilter, setTaxaTargetFilter] = useState("onTarget");
    const [filteredTaxa, setFilteredTaxa] = useState([]);  // shownTaxa + filtering
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
                    (t) => t.replace("_", " ").toLowerCase().includes(sv)
                        || dataset.recordsByFinalID[t].primersLower.reduce((acc, p) => acc || p.includes(sv), false)
                ));
    }, [primerSet, taxaTargetFilter, searchValue]);

    const columns = useMemo(() => [
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
            render: (p) => p
                .filter((p) => primers.has(p))
                .map((p) => <Primer key={p} name={p} />),
        },
        {
            dataIndex: "onTarget",
            render: (oT) => oT
                ? <Tag color="green">On-target</Tag>
                : <Tag color="volcano">Off-target</Tag>,
        },
    ], [dataset, primers, searchValue]);

    const dataSource = useMemo(() => filteredTaxa.map((t) => ({
        taxon: t,
        primers: dataset.recordsByFinalID[t].primers,
        onTarget: coveredTaxa.has(t),
    })), [dataset, filteredTaxa, coveredTaxa]);

    return (
        <Modal
            open={open}
            title={`Primer set ${id}: ${shownTaxa.length} taxa (${filteredTaxa.length} shown)`}
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
                <Table
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
