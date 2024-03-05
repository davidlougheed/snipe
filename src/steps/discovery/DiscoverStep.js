import { Fragment, memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import difference from "set.prototype.difference";

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
    Popover,
    Progress,
    Radio,
    Row,
    Space,
    Spin,
    Statistic,
    Table,
    Tabs,
    Tag,
    Tree,
    Typography,
} from "antd";
import {
    ArrowLeftOutlined,
    BarChartOutlined,
    DownloadOutlined,
    MinusCircleOutlined,
    PlusCircleOutlined,
    SearchOutlined,
} from "@ant-design/icons";

import { Bar, BarChart, CartesianGrid, Label, Legend, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { createVennJSAdapter, VennDiagram } from "@upsetjs/react";
import { layout } from "@upsetjs/venn.js";

import { hsl, lab } from "d3-color";
import { schemeTableau10 } from "d3-scale-chromatic";

import Primer from "../../bits/Primer";

import { CSV_HEADER, PRIMER_GROUPINGS, RESOLUTIONS_WITH_SPECIES } from "../../lib/datasets";
import { formatTaxon, pluralize, serializeCSVRow } from "../../lib/utils";
import { PrimerPaletteContext } from "../../colors";

const { Title } = Typography;

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

const ChangedTaxaSets = ({ dataset, changedTaxaSets, nextNPrimers }) => {
    const nChangedTaxa = Array.from(new Set(changedTaxaSets.map((nts) => nts.added.length + nts.removed.length)));
    const allAdditions = changedTaxaSets.every((nts) => nts.removed.length === 0);

    return (
        <details open={(changedTaxaSets[0].added.length + changedTaxaSets[0].removed.length) < 8}>
            <summary style={{ cursor: "pointer" }}>
                {allAdditions ? "Adds" : "Changes"} {nChangedTaxa.join(" or ")}{allAdditions ? " new " : " "}
                {pluralize("taxon", Math.max(...nChangedTaxa))}{" "}
                vs. with {nextNPrimers}{" "}
                {pluralize("primer", nextNPrimers)}
            </summary>
            <>
                {changedTaxaSets.map((nts, ntsIndex) => (
                    <Fragment key={`taxa-set-${ntsIndex}`}>
                        {nts.added.map((t, ti) => {
                            const taxonRecord = dataset.recordsByFinalID[t];
                            return <Fragment key={t}>
                                <span style={{ whiteSpace: "nowrap" }}>
                                    <PlusCircleOutlined style={{ color: "#7cb305" }} />{" "}
                                    <TaxonWithGroupAndPathPopover record={taxonRecord} />
                                    {ti < (nts.added.length + nts.removed.length) - 1 ? ", " : ""}
                                </span>{" "}
                            </Fragment>;
                        })}
                        {nts.removed.map((t, ti) => {
                            const taxonRecord = dataset.recordsByFinalID[t];
                            return <Fragment key={t}>
                                <span style={{ whiteSpace: "nowrap" }}>
                                    <MinusCircleOutlined style={{ color: "#d4380d" }} />{" "}
                                    <TaxonWithGroupAndPathPopover record={taxonRecord} />
                                    {ti < nts.removed.length - 1 ? ", " : ""}
                                </span>
                            </Fragment>;
                        })}
                        {ntsIndex < changedTaxaSets.length - 1 ? (
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
    dataset,
    primerSet,
    resultParams,
    nextTabResults,
    style,
    onShowTaxa,
    onShowSetDiagram,
}) => {
    const title = `Primer set ${primerSet.id}`;

    const nextTabPrimerSets = nextTabResults?.results ?? null;
    const nextTabNPrimers = nextTabResults?.nPrimers;

    const changedTaxaSets = (nextTabPrimerSets || []).map((ntps) => ({
        added: Array.from(difference(primerSet.coveredTaxa, ntps.coveredTaxa)).sort(),
        removed: Array.from(difference(ntps.coveredTaxa, primerSet.coveredTaxa)).sort(),
    }));

    const newPrimerSets = nextTabPrimerSets
        ? nextTabPrimerSets.map((ntps) => difference(primerSet.primers, ntps.primers))
        : [];

    const downloadPrimerSet = useCallback(() => {
        const longFormRecords = Array.from(primerSet.coveredTaxa).flatMap((id) => {
            const compoundRecord = dataset.recordsByFinalID[id];
            const baseRecord = {...compoundRecord};
            delete baseRecord["primers"];
            delete baseRecord["primersLower"];
            delete baseRecord["key"];
            delete baseRecord["Resolution"];
            return compoundRecord.primers
                .filter((p) => primerSet.primers.has(p))
                .map((p) => ({...baseRecord, Primer: p}));
        });

        const el = document.createElement("a");
        el.href = URL.createObjectURL(new Blob([
            serializeCSVRow(CSV_HEADER),
            ...longFormRecords.map((rec) => serializeCSVRow(CSV_HEADER.map((h) => rec[h]))),
        ], { type: "text/csv" }));
        el.setAttribute("download", title.replace(/\s+/g, "_") + ".csv");
        el.click();
        el.remove();
    }, []);

    return (
        <Card
            title={title}
            size="small"
            style={style}
            extra={<Space direction="horizontal" size={12}>
                <span>Download filtered data:</span>
                <Button size="small" icon={<DownloadOutlined />} onClick={downloadPrimerSet}>
                    On-target {/* TODO: options for downloading with off-target data */}
                </Button>
            </Space>}
        >
            <Space direction="vertical" size={16}>
                <div>
                    <Title level={5}>Primers</Title>
                    {Array.from(primerSet.primers).map((p) =>
                        <Primer
                            key={p}
                            name={p}
                            added={newPrimerSets.reduce((acc, x) => acc || x.has(p), false)}
                            sometimes={!(newPrimerSets.reduce((acc, x) => acc && x.has(p), true))}
                            primerSetCount={primerSet.nPrimers}
                        />
                    )}
                </div>
                <div>
                    <Title level={5}>
                        Taxa:{" "}
                        <span style={{ fontWeight: "normal" }}>
                            {primerSet.coverage} on-target{" "}
                            {nextTabPrimerSets ? `(+${primerSet.coverage - nextTabPrimerSets[0].coverage})` : ""}
                            {resultParams.includeOffTargetTaxa
                                ? <>; <em style={{ color: "#8C8C8C" }}>
                                    {primerSet.offTarget?.coverage ?? 0} off-target</em></>
                                : null}
                        </span>{" "}
                        <Button size="small" onClick={onShowTaxa}>See all</Button>
                    </Title>
                    {changedTaxaSets.length
                        ? <ChangedTaxaSets
                            dataset={dataset}
                            changedTaxaSets={changedTaxaSets}
                            nextNPrimers={nextTabNPrimers}
                        />
                        : null}
                </div>
                <div>
                    <Button onClick={onShowSetDiagram} disabled={primerSet.primers.size > 6}>
                        Show set diagram
                        {primerSet.primers.size > 6 ? <em> (Not available for >6 primers)</em> : ""}
                    </Button>
                </div>
                <div>
                    <Title level={5}>
                        Resolution{" "}
                        <span style={{ fontWeight: "normal", fontStyle: "italic" }}>(on-target)</span>
                    </Title>
                    <Space direction="horizontal">
                        {RESOLUTIONS_WITH_SPECIES.map((r) => (
                            <Statistic key={r} title={r} value={primerSet.resolutionSummary[r]} />
                        ))}
                    </Space>
                </div>
            </Space>
        </Card>
    );
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

// const percentFormatter = (d) => `${(d * 100).toFixed(1)}%`;

const TaxaFilterRadioSelector = ({ includeOffTargetTaxa, value, onChange }) => {
    const [innerValue, setInnerValue] = useState(value ?? "onTarget");

    useEffect(() => {
        if (onChange) onChange(innerValue);
    }, [innerValue]);

    return (
        <Radio.Group size="small" onChange={(e) => setInnerValue(e.target.value)} value={innerValue}>
            <Radio.Button value="onTarget">On-Target</Radio.Button>
            <Radio.Button disabled={!includeOffTargetTaxa} value="offTarget">Off-Target</Radio.Button>
            <Radio.Button disabled={!includeOffTargetTaxa} value="total">Total</Radio.Button>
        </Radio.Group>
    );
};

const CumulativePrimerSetCoverageChart = ({ dataset, results, resultParams }) => {
    const [barType, setBarType] = useState("group");
    const [resultFilter, setResultFilter] = useState("onTarget");  // onTarget | offTarget | total

    const data = useMemo(() => {
        if (!results) return [];
        return results.map(
            ({
                coverageFraction,
                avgCoverageByGroup,
                avgCoverageByGroupOffTarget,
                avgCoverageByGroupTotal,
                nPrimers,
            }) => {
                let acByG = avgCoverageByGroup;
                if (resultFilter === "offTarget") acByG = avgCoverageByGroupOffTarget;
                if (resultFilter === "total") acByG = avgCoverageByGroupTotal;
                return {
                    name: nPrimers.toString(),
                    coverageFraction,
                    ...Object.fromEntries(
                        Object.entries(dataset?.supergroupGroups ?? {})
                            .map(([sg, gs]) => [
                                `supergroup_${sg}`,
                                gs.reduce((acc, g) => acc + (acByG[g] ?? 0), 0),
                            ])
                            .filter(([_, v]) => !!v)),
                    ...Object.fromEntries(
                        Object.entries(acByG)
                            .map(([g, v]) => [`group_${g}`, v])
                            .filter(([_, v]) => !!v)),
                };
            }
        ).reverse();
    }, [dataset, results, resultFilter]);

    return <>
        <Space direction="horizontal" size={16}>
            <div>
                <span>Level:</span>{" "}
                <Radio.Group size="small" onChange={(e) => setBarType(e.target.value)} value={barType}>
                    <Radio.Button value="supergroup">Supergroup</Radio.Button>
                    <Radio.Button value="group">Group</Radio.Button>
                </Radio.Group>
            </div>
            <div>
                <span>Result taxa:</span>{" "}
                <TaxaFilterRadioSelector
                    value={resultFilter}
                    onChange={(v) => setResultFilter(v)}
                    includeOffTargetTaxa={resultParams.includeOffTargetTaxa}
                />
            </div>
            <div>
                <span>Summarization:</span>{" "}Average
            </div>
        </Space>
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
