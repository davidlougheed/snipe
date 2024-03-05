import { useEffect, useMemo, useState } from "react";
import { Input, Modal, Space, Table, Tabs, Tag } from "antd";

import { createVennJSAdapter, VennDiagram } from "@upsetjs/react";
import { layout } from "@upsetjs/venn.js";
import { lab } from "d3-color";

import Primer from "../../bits/Primer";
import PrimerSet from "./PrimerSet";
import TaxaFilterRadioSelector from "./TaxaFilterRadioSelector";
import TaxonWithGroupAndPathPopover from "./TaxonWithGroupAndPathPopover";

import { pluralize } from "../../lib/utils";


const vennJSAdapter = createVennJSAdapter(layout);

const eulerMergeColors = (colors) => {
    // inspired by https://upset.js.org/docs/examples/vennColored
    switch (colors.length) {
        case 0:
            return undefined;
        case 1:
            return colors[0];
        default: {
            const ca = colors.reduce((acc, d) => {
                const c = lab(d || "transparent");
                return { l: acc.l + c.l, a: acc.a + c.a, b: acc.b + c.b };
            }, { l: 0, a: 0, b: 0 });

            const res = lab(
                ca.l / colors.length,
                ca.a / colors.length,
                ca.b / colors.length,
                0.45,
            );
            return res.formatRgb();
        }
    }
};

const primerCountPhrase = (nPrimers) => `${nPrimers} ${pluralize("Primer", nPrimers)}`;

const filterTaxaTargetFactory = (selectedPrimerSet, targetFilter) => (t) => {
    if (targetFilter === "onTarget") return selectedPrimerSet.coveredTaxa.has(t);
    if (targetFilter === "offTarget") return selectedPrimerSet.offTarget.coveredTaxa.has(t);
    return selectedPrimerSet.total.coveredTaxa.has(t);  // otherwise, total
};


const ResultsTabs = ({ dataset, results, resultParams }) => {
    const [selectedPrimerSet, setSelectedPrimerSet] = useState(null);

    const shownTaxa = useMemo(() => {
        if (!selectedPrimerSet) return [];
        return Array.from(selectedPrimerSet.total?.coveredTaxa ?? selectedPrimerSet.coveredTaxa).sort();
    }, [selectedPrimerSet]);
    const [taxaTargetFilter, setTaxaTargetFilter] = useState("onTarget");
    const [filteredTaxa, setFilteredTaxa] = useState([]);  // shownTaxa + filtering
    const [taxaModalSearchValue, setTaxaModalSearchValue] = useState("");
    const [taxaModalVisible, setTaxaModalVisible] = useState(false);

    const [diagramModalVisible, setDiagramModalVisible] = useState(false);

    useEffect(() => {
        if (!selectedPrimerSet) return;

        const sv = taxaModalSearchValue.toLowerCase();
        if (sv === "") {
            setFilteredTaxa(shownTaxa.filter(filterTaxaTargetFactory(selectedPrimerSet, taxaTargetFilter)));
            return;
        }
        setFilteredTaxa(
            shownTaxa
                .filter(filterTaxaTargetFactory(selectedPrimerSet, taxaTargetFilter))
                .filter(
                    (t) => t.replace("_", " ").toLowerCase().includes(sv)
                        || dataset.recordsByFinalID[t].primersLower.reduce((acc, p) => acc || p.includes(sv), false)
                ));
    }, [selectedPrimerSet, taxaTargetFilter, taxaModalSearchValue]);

    const selectedPrimerSetPrimers = useMemo(() => selectedPrimerSet?.primers ?? new Set(), [selectedPrimerSet]);
    const taxaModalColumns = useMemo(() => [
        {
            dataIndex: "taxon",
            render: (t) => (
                <TaxonWithGroupAndPathPopover
                    record={dataset.recordsByFinalID[t]}
                    searchHighlight={taxaModalSearchValue}
                />
            ),
        },
        {
            dataIndex: "primers",
            render: (p) => p
                .filter((p) => selectedPrimerSetPrimers.has(p))
                .map((p) => <Primer key={p} name={p} />),
        },
        {
            dataIndex: "onTarget",
            render: (oT) => oT
                ? <Tag color="green">On-target</Tag>
                : <Tag color="volcano">Off-target</Tag>,
        },
    ], [dataset, selectedPrimerSetPrimers, taxaModalSearchValue]);
    const selectedPrimerSetTaxa = useMemo(() => selectedPrimerSet?.coveredTaxa ?? new Set(), [selectedPrimerSet]);

    return (
        <>
            <Modal
                open={taxaModalVisible}
                title={`Primer set ${selectedPrimerSet?.id}: ${shownTaxa.length} taxa (${filteredTaxa.length} shown)`}
                footer={null}
                width={920}
                onCancel={() => setTaxaModalVisible(false)}
            >
                <Space direction="vertical" style={{ width: "100%" }}>
                    <Space direction="horizontal" size={16}>
                        <Input
                            placeholder="Search"
                            value={taxaModalSearchValue}
                            onChange={(e) => setTaxaModalSearchValue(e.target.value)}
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
                        columns={taxaModalColumns}
                        dataSource={filteredTaxa.map((t) => ({
                            taxon: t,
                            primers: dataset.recordsByFinalID[t].primers,
                            onTarget: selectedPrimerSetTaxa.has(t),
                        }))}
                    />
                </Space>
            </Modal>
            <Modal
                open={diagramModalVisible}
                title={`Primer set ${selectedPrimerSet?.id}: Euler diagram`}
                footer={null}
                destroyOnClose={true}
                width={1040}
                style={{ top: 30 }}
                onCancel={() => setDiagramModalVisible(false)}
            >
                {selectedPrimerSet ? <VennDiagram
                    layout={vennJSAdapter}
                    sets={selectedPrimerSet.coveredTaxaByPrimerUpset}
                    width={990}
                    height={720}
                    theme="light"
                    padding={75}
                    combinations={{ mergeColors: eulerMergeColors }}
                    style={{ maxWidth: "100%", height: "auto" }}
                /> : null}
            </Modal>
            <Tabs items={results.map((res, i) => {
                const { nPrimers, results: npResults } = res;

                const nRes = npResults.length;
                const isNotLastTab = i < results.length - 1;
                const nextTabResults = isNotLastTab ? results[i + 1] : null;

                return {
                    label: (
                        <span>
                            {primerCountPhrase(nPrimers)}: {(res.coverageFraction * 100).toFixed(1)}%
                            {nRes > 1 ? <>{" "}({nRes} sets)</> : null}
                        </span>
                    ),
                    key: `tab-${nPrimers}-primers`,
                    children: (
                        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                            {npResults.map((r) => {
                                // TODO: refactor into some type of primer set object so we can useCallback these
                                //  handlers and have a generally better structure
                                return (
                                    <PrimerSet
                                        key={r.id}
                                        dataset={dataset}
                                        resultParams={resultParams}
                                        primerSet={r}
                                        nextTabResults={nextTabResults}
                                        style={{ width: npResults.length === 1 ? "100%" : "calc(50% - 8px)" }}
                                        onShowTaxa={() => {
                                            setSelectedPrimerSet(r);
                                            setTaxaModalVisible(true);
                                        }}
                                        onShowSetDiagram={() => {
                                            setSelectedPrimerSet(r);
                                            setDiagramModalVisible(true);
                                        }}
                                    />
                                );
                            })}
                        </div>
                    ),
                };
            })}/>
        </>
    );
};

export default ResultsTabs;
