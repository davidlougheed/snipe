import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

import difference from "set.prototype.difference";

import {
    Alert,
    Button,
    Card,
    Col,
    Divider,
    Form,
    Input,
    InputNumber,
    Modal,
    Popover,
    Progress,
    Row,
    Space,
    Spin,
    Tabs,
    Tree,
    Typography
} from "antd";
import { ArrowLeftOutlined, ArrowRightOutlined, SearchOutlined } from "@ant-design/icons";

import { asSets, createVennJSAdapter, UpSetJS, VennDiagram } from "@upsetjs/react";
import { layout } from "@upsetjs/venn.js";

import Primer from "../bits/Primer";

import { PRIMER_GROUPINGS } from "../lib/datasets";
import { formatTaxon, pluralize } from "../lib/utils";

const vennJSAdapter = createVennJSAdapter(layout);


const formatRecordPath = (rec) => (
    <>
        <strong>{rec["Taxa_group"]}:</strong>{" "}
        {PRIMER_GROUPINGS.slice(1, -1).map((pg) => rec[pg]).join(" › ")} ›{" "}
        {formatTaxon(rec["Final_ID"])}
    </>
);


const NewTaxaSets = ({ dataset, newTaxaSets, nextNPrimers }) => {
    const nAddedTaxa = Array.from(new Set(newTaxaSets.map((nts) => nts.length)));

    return (
        <details open={newTaxaSets[0].length < 8}>
            <summary style={{ cursor: "pointer" }}>
                Adds {nAddedTaxa.join(" or ")} new {" "}
                {pluralize("taxon", Math.max(...nAddedTaxa))}{" "}
                vs. with {nextNPrimers}{" "}
                {pluralize("primer", nextNPrimers)}
            </summary>
            <>
                {newTaxaSets.map((nts, ntsIndex) => (
                    <Fragment key={`taxa-set-${ntsIndex}`}>
                        {nts.map((t, ti) => {
                            const taxonRecord = dataset.recordsByFinalID[t];
                            return <Fragment key={t}>
                                <Popover trigger="click" content={formatRecordPath(taxonRecord)}>
                                    <span style={{ textDecoration: "underline", cursor: "pointer" }}>
                                        {formatTaxon(t)}
                                    </span>&nbsp;({taxonRecord["Taxa_group"]})
                                </Popover>
                                {ti < newTaxaSets[0].length - 1 ? ", " : ""}
                            </Fragment>;
                        })}
                        {ntsIndex < newTaxaSets.length - 1 ? (
                            <div><strong>— OR —</strong></div>
                        ) : null}
                    </Fragment>
                ))}
            </>
        </details>
    );
};

const ResultsTabs = ({ dataset, results }) => {
    const [selectedPrimerSetTitle, setSelectedPrimerSetTitle] = useState("");

    const [shownTaxa, setShownTaxa] = useState([]);
    const [filteredTaxa, setFilteredTaxa] = useState([]);  // shownTaxa + filtering
    const [taxaModalSearchValue, setTaxaModalSearchValue] = useState("");
    const [taxaModalVisible, setTaxaModalVisible] = useState(false);

    const [diagramSets, setDiagramSets] = useState(null);
    const [diagramModalVisible, setDiagramModalVisible] = useState(false);

    useEffect(() => {
        const sv = taxaModalSearchValue.toLowerCase();
        if (sv === "") {
            setFilteredTaxa(shownTaxa);
            return;
        }
        setFilteredTaxa(shownTaxa.filter((t) => t.replace("_", " ").toLowerCase().includes(sv)));
    }, [shownTaxa, taxaModalSearchValue]);

    return (
        <>
            <Modal
                open={taxaModalVisible}
                title={`${selectedPrimerSetTitle} - Taxa`}
                footer={null}
                onCancel={() => setTaxaModalVisible(false)}
            >
                <Space direction="vertical" style={{ width: "100%" }}>
                    <Input
                        placeholder="Search"
                        value={taxaModalSearchValue}
                        onChange={(e) => setTaxaModalSearchValue(e.target.value)}
                        allowClear={true}
                    />
                    <ul style={{ margin: 0, paddingLeft: "1em" }}>
                        {filteredTaxa.map((t) => <li key={t}>{formatTaxon(t, taxaModalSearchValue)}</li>)}
                    </ul>
                </Space>
            </Modal>
            <Modal
                open={diagramModalVisible}
                title={`${selectedPrimerSetTitle} - Euler diagram`}
                footer={null}
                destroyOnClose={true}
                width={890}
                onCancel={() => setDiagramModalVisible(false)}
            >
                {diagramSets && <VennDiagram
                    layout={vennJSAdapter}
                    sets={diagramSets}
                    width={840}
                    height={640}
                    theme="light"
                    style={{ maxWidth: "100%", height: "auto" }}
                />}
            </Modal>
            <Tabs items={results.map((res, i) => {
                const { nPrimers, results: npResults } = res;

                const nRes = npResults.length;
                const isNotLastTab = i < results.length - 1;
                const nextTabResults = isNotLastTab ? results[i + 1] : null;

                return {
                    label: <span>
                        {nPrimers} {pluralize("Primer", nPrimers)}: {(res.coverage * 100).toFixed(1)}%
                        {nRes > 1 ? <>{" "}({nRes} sets)</> : null}
                    </span>,
                    key: `tab-${nPrimers}-primers`,
                    children: (
                        <div style={{ display: "flex", gap: 16 }}>
                            {npResults.map((r, j) => {
                                const nextTabPrimerSets = nextTabResults?.results ?? null;

                                const newTaxaSets = nextTabPrimerSets
                                    ? nextTabPrimerSets.map((ntps) =>
                                        Array.from(difference(r.coveredTaxa, ntps.coveredTaxa)).sort())
                                    : [];

                                const newPrimerSets = nextTabPrimerSets
                                    ? nextTabPrimerSets.map((ntps) => difference(r.primers, ntps.primers))
                                    : [];

                                const primerSetTitle = `Primer set ${nPrimers}-${j + 1}`;

                                return (
                                    <Card
                                        key={`primers-${nPrimers}-primer-set-${j + 1}`}
                                        title={primerSetTitle}
                                        size="small"
                                        style={{ width: npResults.length === 1 ? "100%" : "calc(50% - 8px)" }}
                                    >
                                        <Space direction="vertical" size={16}>
                                            <div>
                                                <strong>Primers:</strong><br/>
                                                {Array.from(r.primers).map((p) =>
                                                    <Primer
                                                        key={p}
                                                        name={p}
                                                        added={newPrimerSets.reduce((acc, x) => acc || x.has(p), false)}
                                                        sometimes={!(newPrimerSets.reduce(
                                                            (acc, x) => acc && x.has(p), true))}
                                                        primerSetCount={nPrimers}
                                                    />
                                                )}
                                            </div>
                                            <div>
                                                <strong>Taxa:</strong> {r.coveredTaxa.size}{" "}
                                                <Button size="small" onClick={() => {
                                                    setSelectedPrimerSetTitle(primerSetTitle);
                                                    setShownTaxa(Array.from(r.coveredTaxa).sort())
                                                    setTaxaModalVisible(true);
                                                }}>See all</Button>
                                                {newTaxaSets.length
                                                    ? <NewTaxaSets
                                                        dataset={dataset}
                                                        newTaxaSets={newTaxaSets}
                                                        nextNPrimers={nextTabResults.nPrimers}
                                                    />
                                                    : null}
                                            </div>
                                            <div>
                                                <Button onClick={() => {
                                                    setSelectedPrimerSetTitle(primerSetTitle);
                                                    setDiagramSets(r.coveredTaxaByPrimerUpset);
                                                    setDiagramModalVisible(true);
                                                }}>Show set diagram</Button>
                                            </div>
                                        </Space>
                                    </Card>
                                );
                            })}
                        </div>
                    ),
                };
            })}/>
        </>
    );
}

const DiscoverStep = ({ visible, dataset, onBack, onFinish }) => {
    const worker = useRef(null);
    const searching = useRef(false);  // ref so that the closure can get the true value

    const [modalVisible, setModalVisible] = useState(false);

    const [expandedKeys, setExpandedKeys] = useState([]);
    const [checkedKeys, setCheckedKeys] = useState([]);
    const [nPrimers, setNPrimers] = useState(dataset?.primers?.length ?? 1);

    const [hasSearched, setHasSearched] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState(null);

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
                setResults(data.results);
            } else if (type === "progress" && searching.current) {
                setProgress(data.percent);
            }
        };
    }, []);

    useEffect(() => {
        // Reset state when dataset changes
        setNPrimers(dataset?.primers?.length ?? 1);
        setModalVisible(false);
        setExpandedKeys([]);
        setCheckedKeys([]);
    }, [dataset]);

    const onCheck = useCallback((keys) => setCheckedKeys(keys), []);

    useEffect(() => {
        setProgress(0);
    }, [checkedKeys]);

    const onExpand = useCallback((keys, e) => {
        const newExpandedKeys = new Set(keys);

        if (e.expanded) {  // Check we're expanding and not contracting this node
            // We can have a lot of paths of 1 option over and over - auto-expand these to make navigation nicer
            let node = e.node;
            while (node.children?.length === 1) {
                newExpandedKeys.add(node.key);
                node = node.children?.[0];
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

    useEffect(() => {
        if (!dataset) return;

        const checkedRecords = checkedLeaves.map((key) => dataset.recordsByKey[key]);
        const primerSubset = new Set(checkedRecords.map((rec) => rec["Primer_name"]));

        console.log(checkedRecords);
        console.log(primerSubset);
    }, [dataset, checkedLeaves]);

    const showModal = useCallback(() => setModalVisible(true), []);
    const hideModal = useCallback(() => setModalVisible(false), []);

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
                records: checkedRecords,
                maxPrimers: nPrimers,
            },
        });
        setHasSearched(true);
        searching.current = true;
    }, [dataset, worker, checkedLeaves, nPrimers]);

    if (!visible) return <Fragment/>;
    // noinspection JSCheckFunctionSignatures
    return <>
        <Row gutter={[24, 24]}>
            <Col md={24} lg={10} xl={8}>
                <Card title="Criteria">
                    <Form layout="vertical">
                        <Form.Item
                            label="Taxa"
                            help={<div style={{ height: 68 }}>
                                The taxa available here are just those which are detectable by the dataset specified.
                            </div>}
                        >
                            <Space>
                                <Button onClick={showModal}>Select Taxa &hellip;</Button>
                                <span style={{ color: nCheckedLeaves === 0 ? "#EE4433" : undefined }}>
                                    {checkedLeaves.length} entries selected
                                </span>
                            </Space>
                        </Form.Item>
                        <Form.Item
                            label="Max. Primers"
                            help={<div style={{ height: 68 }}>
                                If this value is higher than the number of primers needed, only the fewest needed
                                primers will be used.
                            </div>}
                        >
                            <InputNumber
                                min={1}
                                max={dataset.primers.length}
                                value={nPrimers}
                                onChange={(v) => {
                                    setProgress(0);
                                    setNPrimers(v);
                                }}
                            />
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
                <Typography.Title level={3}>Results</Typography.Title>
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
                {!!results && <ResultsTabs dataset={dataset} results={results} />}
            </Col>
        </Row>

        <Modal
            title="Select Taxa"
            open={modalVisible}
            onCancel={hideModal}
            width={800}
            okText="Done"
            footer={[<Button key="done" type="primary" onClick={hideModal}>Done</Button>]}
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
                    onCheck={onCheck}
                />
            </Space>
        </Modal>
        <Divider/>
        <Row>
            <Col flex={1}>
                <Button size="large" icon={<ArrowLeftOutlined/>} onClick={onBack}>Back</Button>
            </Col>
            <Col flex={1} style={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                    type="primary"
                    size="large"
                    icon={<ArrowRightOutlined/>}
                    // disabled={!hasSearched}
                    disabled={true}  // for now
                    onClick={() => onFinish()}
                >Next Step</Button>
            </Col>
        </Row>
    </>;
};

export default DiscoverStep;
