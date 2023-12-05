import { Fragment, memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

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
    Radio,
    Row,
    Space,
    Spin,
    Tabs,
    Tree,
    Typography
} from "antd";
import { ArrowLeftOutlined, ArrowRightOutlined, SearchOutlined } from "@ant-design/icons";

import { Bar, BarChart, CartesianGrid, Label, Legend, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { createVennJSAdapter, VennDiagram } from "@upsetjs/react";
import { layout } from "@upsetjs/venn.js";

import { hsl, lab } from "d3-color";
import { schemeTableau10 } from "d3-scale-chromatic";

import Primer from "../bits/Primer";

import { PRIMER_GROUPINGS } from "../lib/datasets";
import { formatTaxon, pluralize } from "../lib/utils";
import { PrimerPaletteContext } from "../colors";

const vennJSAdapter = createVennJSAdapter(layout);


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
                                <TaxonWithGroupAndPathPopover record={taxonRecord} />
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

const PrimerSet = ({
    title,
    dataset,
    nPrimers,
    result,
    nextTabResults,
    style,
    onShowTaxa,
    onShowSetDiagram,
}) => {
    const nextTabPrimerSets = nextTabResults?.results ?? null;
    const nextTabNPrimers = nextTabResults?.nPrimers;

    const newTaxaSets = nextTabPrimerSets
        ? nextTabPrimerSets.map((ntps) =>
            Array.from(difference(result.coveredTaxa, ntps.coveredTaxa)).sort())
        : [];

    const newPrimerSets = nextTabPrimerSets
        ? nextTabPrimerSets.map((ntps) => difference(result.primers, ntps.primers))
        : [];

    return (
        <Card title={title} size="small" style={style}>
            <Space direction="vertical" size={16}>
                <div>
                    <strong>Primers:</strong><br/>
                    {Array.from(result.primers).map((p) =>
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
                    <strong>Taxa:</strong> {result.coveredTaxa.size}{" "}
                    <Button size="small" onClick={onShowTaxa}>See all</Button>
                    {newTaxaSets.length
                        ? <NewTaxaSets
                            dataset={dataset}
                            newTaxaSets={newTaxaSets}
                            nextNPrimers={nextTabNPrimers}
                        />
                        : null}
                </div>
                <div>
                    <Button onClick={onShowSetDiagram} disabled={result.primers.size > 6}>
                        Show set diagram
                        {result.primers.size > 6 ? <em> (Not available for >6 primers)</em> : ""}
                    </Button>
                </div>
            </Space>
        </Card>
    );
};

const primerCountPhrase = (nPrimers) => `${nPrimers} ${pluralize("Primer", nPrimers)}`;

const ResultsTabs = ({ dataset, results }) => {
    const [selectedPrimerSetTitle, setSelectedPrimerSetTitle] = useState("");
    const [selectedPrimers, setSelectedPrimers] = useState(new Set());

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
        setFilteredTaxa(shownTaxa.filter(
            (t) => t.replace("_", " ").toLowerCase().includes(sv)
                || dataset.recordsByFinalID[t].primersLower.reduce((acc, p) => acc || p.includes(sv), false)
        ));
    }, [shownTaxa, taxaModalSearchValue]);

    return (
        <>
            <Modal
                open={taxaModalVisible}
                title={`${selectedPrimerSetTitle}: ${shownTaxa.length} taxa (${filteredTaxa.length} shown)`}
                footer={null}
                width={890}
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
                        {filteredTaxa.map((t) => <li key={t}>
                            <span style={{ marginRight: "1em" }}>
                                <TaxonWithGroupAndPathPopover
                                    record={dataset.recordsByFinalID[t]}
                                    searchHighlight={taxaModalSearchValue}
                                />
                            </span>
                            {dataset.recordsByFinalID[t].primers
                                .filter((p) => selectedPrimers.has(p))
                                .map((p) => <Primer key={p} name={p} />)}
                        </li>)}
                    </ul>
                </Space>
            </Modal>
            <Modal
                open={diagramModalVisible}
                title={`${selectedPrimerSetTitle}: Euler diagram`}
                footer={null}
                destroyOnClose={true}
                width={1040}
                style={{ top: 30 }}
                onCancel={() => setDiagramModalVisible(false)}
            >
                {diagramSets ? <VennDiagram
                    layout={vennJSAdapter}
                    sets={diagramSets}
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
                            {npResults.map((r, j) => {
                                // TODO: refactor into some type of primer set object so we can useCallback these
                                //  handlers and have a generally better structure
                                const primerSetTitle = `Primer set ${nPrimers}-${j + 1}`;
                                return (
                                    <PrimerSet
                                        key={`primers-${nPrimers}-primer-set-${j + 1}`}
                                        title={primerSetTitle}
                                        dataset={dataset}
                                        result={r}
                                        nPrimers={nPrimers}
                                        nextTabResults={nextTabResults}
                                        style={{ width: npResults.length === 1 ? "100%" : "calc(50% - 8px)" }}
                                        onShowTaxa={() => {
                                            setSelectedPrimerSetTitle(primerSetTitle);
                                            setSelectedPrimers(r.primers);
                                            setShownTaxa(Array.from(r.coveredTaxa).sort())
                                            setTaxaModalVisible(true);
                                        }}
                                        onShowSetDiagram={() => {
                                            setSelectedPrimerSetTitle(primerSetTitle);
                                            setDiagramSets(r.coveredTaxaByPrimerUpset);
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

// const percentFormatter = (d) => `${(d * 100).toFixed(1)}%`;

const CumulativePrimerSetCoverageChart = ({ dataset, results }) => {
    const [barType, setBarType] = useState("group");

    const data = useMemo(() => {
        if (!results) return [];
        return results.map(({ coverageFraction, avgCoverageByGroup, nPrimers }) => ({
            name: nPrimers.toString(),
            coverageFraction,
            ...Object.fromEntries(
                Object.entries(dataset?.supergroupGroups ?? {})
                    .map(([sg, gs]) => [
                        `supergroup_${sg}`,
                        gs.reduce((acc, g) => acc + (avgCoverageByGroup[g] ?? 0), 0),
                    ])
                    .filter(([_, v]) => !!v)),
            ...Object.fromEntries(
                Object.entries(avgCoverageByGroup)
                    .map(([g, v]) => [`group_${g}`, v])
                    .filter(([_, v]) => !!v)),
        })).reverse();
    }, [dataset, results]);

    return <>
        <Radio.Group size="small" onChange={(e) => setBarType(e.target.value)} value={barType}>
            <Radio.Button value="supergroup">Supergroup</Radio.Button>
            <Radio.Button value="group">Group</Radio.Button>
        </Radio.Group>
        <Divider />
        <ResponsiveContainer width="100%" height={550}>
            <BarChart data={data} margin={{ top: 8, bottom: 32, left: 16 }}>
                <CartesianGrid vertical={false} stroke="#EEEEEE" />
                <XAxis dataKey="name">
                    <Label value="# primers" position="bottom" />
                </XAxis>
                <YAxis tickCount={8}>
                    <Label value="coverage (# taxa)" angle={-90} position="left" style={{ textAnchor: "middle" }} />
                </YAxis>
                {/*<Tooltip formatter={(value) => percentFormatter(value)} />*/}
                <Legend verticalAlign="bottom" wrapperStyle={{ minHeight: 88, bottom: 0 }} />
                {barType === "group" ? (
                    Object.entries(dataset?.supergroupGroups ?? {}).flatMap(([sg, gs]) =>
                        gs.filter((g) => data.find((d) => `${barType}_${g}` in d))
                            .map((g) => {
                                const color = hsl(schemeTableau10[dataset.supergroups.indexOf(sg)]);
                                color.l = 0.25 + ((gs.indexOf(g) + 1) / (gs.length + 1)) * 0.6;
                                const k = `${barType}_${g}`;
                                return <Bar key={k} dataKey={k} name={g} stackId="a" fill={color.toString()} />;
                            })
                    )
                ) : (
                    Object.keys(dataset?.supergroupGroups ?? {})
                        .filter((sg) => data.find((d) => `${barType}_${sg}` in d))
                        .map((sg) => {
                            const color = hsl(schemeTableau10[dataset.supergroups.indexOf(sg)]);
                            color.l = 0.55;  // normalize luminosity to be in the middle of where it is for group bars
                            const k = `${barType}_${sg}`;
                            return <Bar key={k} dataKey={k} name={sg} stackId="supergroup" fill={color.toString()} />;
                        })
                )}
            </BarChart>
        </ResponsiveContainer>
    </>;
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

    const onCheck = useCallback((keys) => setCheckedKeys(keys), []);

    useEffect(() => {
        setProgress(0);
    }, [checkedKeys]);

    const onExpand = useCallback((keys, e) => {
        const newExpandedKeys = new Set(keys);

        if (e.expanded) {  // Check we're expanding and not contracting this node
            // We can have a lot of paths of 1 option over and over - auto-expand these to make navigation nicer
            let node = e.node;
            newExpandedKeys.add(node.key);
            console.log(node);
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

    const showPrimerSetCoverageModal = useCallback(() => setPrimerSetCoverageModalVisible(true), []);
    const hidePrimerSetCoverageModal = useCallback(() => setPrimerSetCoverageModalVisible(false), []);

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
                primerPalette,
            },
        });
        setHasSearched(true);
        searching.current = true;
    }, [dataset, worker, checkedLeaves, nPrimers, primerPalette]);

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
                                <Button onClick={showTaxaSelectModal}>Select Taxa &hellip;</Button>
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
                <div style={{ display: "flex", gap: 16 }}>
                    <Typography.Title level={3} style={{ flex: 1 }}>Results</Typography.Title>
                    <Button disabled={!results} onClick={showPrimerSetCoverageModal}>
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
                {!!results && <ResultsTabs dataset={dataset} results={results} />}
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
                    onCheck={onCheck}
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
            <CumulativePrimerSetCoverageChart dataset={dataset} results={results} />
        </Modal>
    </>;
};

export default DiscoverStep;
