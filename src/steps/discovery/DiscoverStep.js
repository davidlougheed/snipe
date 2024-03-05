import { Fragment, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import {
    Alert,
    Button,
    Card,
    Checkbox,
    Col,
    Divider,
    Form,
    Input,
    InputNumber,
    Modal,
    Progress,
    Row,
    Space,
    Spin,
    Table,
    Tabs,
    Tag,
    Tree,
    Typography,
} from "antd";
import { ArrowLeftOutlined, BarChartOutlined, SearchOutlined } from "@ant-design/icons";

import { createVennJSAdapter, VennDiagram } from "@upsetjs/react";
import { layout } from "@upsetjs/venn.js";

import { lab } from "d3-color";

import CumulativePrimerSetCoverageChart from "./CumulativePrimerSetCoverageChart";
import Primer from "../../bits/Primer";
import PrimerSet from "./PrimerSet";
import TaxaFilterRadioSelector from "./TaxaFilterRadioSelector";
import TaxonWithGroupAndPathPopover from "./TaxonWithGroupAndPathPopover";

import { pluralize } from "../../lib/utils";
import { PrimerPaletteContext } from "../../colors";

const { Title } = Typography;

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

const DiscoverStep = ({ visible, dataset, onBack }) => {
    const worker = useRef(null);
    const searching = useRef(false);  // ref so that the closure can get the true value

    const [taxaSelectModalVisible, setTaxaSelectModalVisible] = useState(false);
    const [primerSetCoverageModalVisible, setPrimerSetCoverageModalVisible] = useState(false);

    const [expandedKeys, setExpandedKeys] = useState([]);
    const [checkedKeys, setCheckedKeys] = useState([]);
    const [nPrimers, setNPrimers] = useState(dataset?.primers?.length ?? 1);

    const [hasSearched, setHasSearched] = useState(false);
    const [progress, setProgress] = useState(0);

    const [resultParams, setResultParams] = useState({});
    const [results, setResults] = useState(null);

    const primerPalette = useContext(PrimerPaletteContext);

    useEffect(() => {
        // On first load, set up the worker
        const w = new Worker(new URL("../lib/worker.js", import.meta.url));
        worker.current = w;
        w.onmessage = ({ data: message }) => {
            // if we receive error/result, and we're not searching, it means it's from a previous dataset/selection, so
            // just ignore the result I guess.

            console.debug("main received", message, "searching", searching.current);

            const { type, data } = message;

            if (type === "error" && searching.current) {
                // TODO
                searching.current = false;
            } else if (type === "result" && searching.current) {
                // TODO
                searching.current = false;
                console.debug("received results", data);
                setProgress(100);
                setResultParams(data.params);
                setResults(data.results);
            } else if (type === "progress" && searching.current) {
                setProgress(data.percent);
            }
        };
    }, []);

    useEffect(() => {
        // Reset state when dataset changes
        setNPrimers(dataset?.primers?.length ?? 1);
        setTaxaSelectModalVisible(false);
        setExpandedKeys([]);
        setCheckedKeys([]);
    }, [dataset]);

    const onTaxaCheck = useCallback((keys) => setCheckedKeys(keys), []);

    const onExpand = useCallback((keys, e) => {
        const newExpandedKeys = new Set(keys);

        if (e.expanded) {  // Check we're expanding and not contracting this node
            // We can have a lot of paths of 1 option over and over - auto-expand these to make navigation nicer
            let node = e.node;
            newExpandedKeys.add(node.key);
            while (node.children?.length === 1) {
                node = node.children?.[0];
                newExpandedKeys.add(node.key);
            }
        }

        setExpandedKeys(Array.from(newExpandedKeys));
    }, []);

    const checkedLeaves = useMemo(() => checkedKeys.filter((k) => k.endsWith("leaf")), [checkedKeys]);

    const selectAll = useCallback(() => {
        setCheckedKeys(dataset.records.map((rec) => rec.key));
    }, [dataset]);
    const deselectAll = useCallback(() => setCheckedKeys([]), []);

    const nCheckedLeaves = checkedLeaves.length;

    const showTaxaSelectModal = useCallback(() => setTaxaSelectModalVisible(true), []);
    const hideTaxaSelectModal = useCallback(() => setTaxaSelectModalVisible(false), []);

    const [includeOffTargetTaxa, setIncludeOffTargetTaxa] = useState(false);
    const updateIncludeOffTargetTaxa = useCallback((e) => setIncludeOffTargetTaxa(e.target.checked), []);

    const showPrimerSetCoverageModal = useCallback(() => setPrimerSetCoverageModalVisible(true), []);
    const hidePrimerSetCoverageModal = useCallback(() => setPrimerSetCoverageModalVisible(false), []);

    useEffect(() => {
        // If the search criteria change, reset the progress
        setProgress(0);
    }, [checkedKeys, nPrimers, includeOffTargetTaxa]);

    const onSearch = useCallback(() => {
        if (!dataset) return;
        if (!worker.current) {
            console.error("Cannot find worker");
            return;
        }

        if (!checkedLeaves.length) return;
        const checkedRecords = checkedLeaves.map((key) => dataset.recordsByKey[key]);

        setProgress(0);
        setResults(null);

        worker.current.postMessage({
            type: "search",
            data: {
                selectedRecords: checkedRecords,
                allRecords: dataset.records,
                maxPrimers: nPrimers,
                includeOffTargetTaxa,
                primerPalette,
            },
        });
        setHasSearched(true);
        searching.current = true;
    }, [dataset, worker, checkedLeaves, nPrimers, includeOffTargetTaxa, primerPalette]);

    if (!visible) return <Fragment/>;
    // noinspection JSCheckFunctionSignatures
    return <>
        <Row gutter={[24, 24]}>
            <Col md={24} lg={10} xl={8}>
                <Card title="Criteria">
                    <Form layout="vertical">
                        <Form.Item
                            label="Target taxa"
                            help={<div style={{ marginBottom: 8 }}>
                                The taxa available here are just those which are detectable by the dataset specified.
                            </div>}
                        >
                            <Space>
                                <Button onClick={showTaxaSelectModal}>Select Taxa &hellip;</Button>
                                <span style={{ color: nCheckedLeaves === 0 ? "#EE4433" : undefined }}>
                                    {checkedLeaves.length}/{dataset?.records?.length ?? 0} entries selected
                                </span>
                            </Space>
                        </Form.Item>
                        <Form.Item
                            label="Max. primers"
                            help={<div style={{ marginBottom: 8 }}>
                                If this value is higher than the number of primers needed, only the fewest needed
                                primers will be used.
                            </div>}
                        >
                            <InputNumber
                                min={1}
                                max={dataset.primers.length}
                                value={nPrimers}
                                onChange={(v) => setNPrimers(v)}
                            />
                        </Form.Item>
                        <Form.Item help={<div style={{ marginBottom: 16 }}>
                            If checked, unselected (off-target) taxa will be included in the result sets if primer(s)
                            happen to also detect them.
                        </div>}>
                            <Checkbox checked={includeOffTargetTaxa} onChange={updateIncludeOffTargetTaxa}>
                                Include off-target taxa?</Checkbox>
                        </Form.Item>
                        <Form.Item style={{ marginBottom: 0 }}>
                            <div style={{ display: "flex", gap: 12, width: "100%", alignItems: "baseline" }}>
                                <Button
                                    type="primary"
                                    icon={<SearchOutlined/>}
                                    disabled={!nCheckedLeaves || searching.current}
                                    loading={searching.current}
                                    onClick={onSearch}
                                >Search</Button>
                                <div style={{ flex: 1 }}>
                                    {hasSearched && (
                                        <Progress
                                            percent={progress}
                                            showInfo={true}
                                            format={(percent) => `${percent.toFixed(0)}%`}
                                        />
                                    )}
                                </div>
                            </div>
                        </Form.Item>
                    </Form>
                </Card>
            </Col>
            <Col md={24} lg={14} xl={16}>
                <div style={{ display: "flex", gap: 16 }}>
                    <Title level={3} style={{ flex: 1 }}>Results</Title>
                    <Button disabled={!results} onClick={showPrimerSetCoverageModal} icon={<BarChartOutlined />}>
                        Cumulative Primer Set Coverage
                    </Button>
                </div>
                {!hasSearched && (
                    <Alert
                        message="No results yet"
                        description={<span>
                            Select taxa, choose your desired maximum number of primers, and press "Search" in order to
                            see corresponding primer sets. Searching may take a few seconds.
                        </span>}
                        type="info"
                        showIcon={true}
                    />
                )}
                {searching.current && (
                    <Spin size="large" spinning={true}/>
                )}
                {!!results && <ResultsTabs dataset={dataset} results={results} resultParams={resultParams} />}
            </Col>
        </Row>

        <Divider />

        <Row>
            <Col flex={1}>
                <Button size="large" icon={<ArrowLeftOutlined/>} onClick={onBack}>Back</Button>
            </Col>
        </Row>

        <Modal
            title="Select Taxa"
            open={taxaSelectModalVisible}
            onCancel={hideTaxaSelectModal}
            width={800}
            okText="Done"
            footer={[<Button key="done" type="primary" onClick={hideTaxaSelectModal}>Done</Button>]}
        >
            <Space direction="vertical">
                <Space direction="horizontal">
                    {nCheckedLeaves} entries selected
                    <Button size="small" onClick={selectAll}>Select All</Button>
                    <Button size="small" onClick={deselectAll}>Deselect All</Button>
                </Space>
                <Tree
                    checkable={true}
                    showLine={true}
                    treeData={dataset.tree}
                    expandedKeys={expandedKeys}
                    onExpand={onExpand}
                    checkedKeys={checkedKeys}
                    onCheck={onTaxaCheck}
                />
            </Space>
        </Modal>

        <Modal
            title="Cumulative Primer Set Coverage"
            open={primerSetCoverageModalVisible}
            width={800}
            footer={null}
            onCancel={hidePrimerSetCoverageModal}
        >
            <CumulativePrimerSetCoverageChart dataset={dataset} results={results} resultParams={resultParams} />
        </Modal>
    </>;
};

export default DiscoverStep;
