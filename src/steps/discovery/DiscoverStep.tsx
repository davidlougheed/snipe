import {
    Fragment,
    type Key,
    type MouseEventHandler,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    Alert,
    Button,
    Card,
    Checkbox,
    Col,
    Divider,
    Form,
    InputNumber,
    Modal,
    Progress,
    Row,
    Space,
    Spin,
    Tree,
    type TreeProps,
    type TreeDataNode,
    Typography,
} from "antd";
import type { CheckboxChangeEvent } from "antd/es/checkbox";
import { ArrowLeftOutlined, BarChartOutlined, SearchOutlined } from "@ant-design/icons";

import CumulativePrimerSetCoverageChart from "./CumulativePrimerSetCoverageChart";
import ResultsTabs from "./ResultsTabs";

import { PrimerPaletteContext } from "@lib/colors";
import type { SNIPeDataset } from "@lib/datasets";
import type { SNIPeSearchParams } from "@lib/types";

const { Title } = Typography;

type DiscoverStepProps = {
    visible: boolean;
    dataset: SNIPeDataset;
    onBack: () => void;
};

const DiscoverStep = ({ visible, dataset, onBack }: DiscoverStepProps) => {
    const worker = useRef<Worker | null>(null);
    const searching = useRef(false); // ref so that the closure can get the true value

    const [taxaSelectModalVisible, setTaxaSelectModalVisible] = useState(false);
    const [primerSetCoverageModalVisible, setPrimerSetCoverageModalVisible] = useState(false);

    const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
    const [checkedKeys, setCheckedKeys] = useState<string[]>([]);

    const maxNPrimers = dataset?.primers?.length ?? 1;
    const [nPrimers, setNPrimers] = useState(maxNPrimers);

    const [hasSearched, setHasSearched] = useState(false);
    const [progress, setProgress] = useState(0);

    const [resultParams, setResultParams] = useState<SNIPeSearchParams | null>(null);
    const [results, setResults] = useState(null);

    const primerPalette = useContext(PrimerPaletteContext);

    useEffect(() => {
        // On first load, set up the worker
        const w = new Worker(new URL("../../lib/worker.ts", import.meta.url));
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

    const onTaxaCheck = useCallback((keys: Key[] | { checked: Key[]; halfChecked: Key[] }) => {
        setCheckedKeys("checked" in keys ? (keys.checked as string[]) : (keys as string[]));
    }, []);

    const onExpand = useCallback<Exclude<TreeProps["onExpand"], undefined>>((keys, e) => {
        const newExpandedKeys = new Set(keys);

        if (e.expanded) {
            // Check we're expanding and not contracting this node
            // We can have a lot of paths of 1 option over and over - auto-expand these to make navigation nicer
            let node: TreeDataNode = e.node;
            newExpandedKeys.add(node.key);
            while (node.children?.length === 1) {
                node = node.children?.[0];
                newExpandedKeys.add(node.key);
            }
        }

        setExpandedKeys(Array.from(newExpandedKeys) as string[]);
    }, []);

    const checkedLeaves = useMemo(() => checkedKeys.filter((k) => k.endsWith("leaf")), [checkedKeys]);

    const selectAll = useCallback(() => {
        setCheckedKeys(dataset.records.map((rec) => rec.key));
    }, [dataset]);
    const deselectAll = useCallback(() => setCheckedKeys([]), []);

    const selectAllLink = useCallback<MouseEventHandler<HTMLAnchorElement>>(
        (e) => {
            e.stopPropagation();
            e.preventDefault();
            selectAll();
        },
        [selectAll],
    );

    const nCheckedLeaves = checkedLeaves.length;

    const showTaxaSelectModal = useCallback(() => setTaxaSelectModalVisible(true), []);
    const hideTaxaSelectModal = useCallback(() => setTaxaSelectModalVisible(false), []);

    const [includeOffTargetTaxa, setIncludeOffTargetTaxa] = useState(false);
    const updateIncludeOffTargetTaxa = useCallback(
        (e: CheckboxChangeEvent) => setIncludeOffTargetTaxa(e.target.checked),
        [],
    );

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

    if (!visible) return <Fragment />;
    // noinspection JSCheckFunctionSignatures
    return (
        <>
            <Row gutter={[24, 24]}>
                <Col md={24} lg={10} xl={8}>
                    <Card title="Criteria">
                        <Form layout="vertical">
                            <Form.Item
                                label={
                                    <Space size={16}>
                                        <span>Target taxa</span>
                                        <a href="#" onClick={selectAllLink}>
                                            Select all
                                        </a>
                                    </Space>
                                }
                                help={
                                    <div style={{ marginBottom: 8 }}>
                                        The taxa available here are just those which are detectable by the dataset
                                        specified.
                                    </div>
                                }
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
                                help={
                                    <div style={{ marginBottom: 8 }}>
                                        If this value is higher than the number of primers needed, only the fewest
                                        needed primers will be used.
                                    </div>
                                }
                            >
                                <InputNumber
                                    min={1}
                                    max={dataset.primers.length}
                                    value={nPrimers}
                                    onChange={(v) => setNPrimers(v ?? maxNPrimers)}
                                />
                            </Form.Item>
                            <Form.Item
                                help={
                                    <div style={{ marginBottom: 16 }}>
                                        If checked, unselected (off-target) taxa will be included in the result sets
                                        if primer(s) happen to also detect them.
                                    </div>
                                }
                            >
                                <Checkbox checked={includeOffTargetTaxa} onChange={updateIncludeOffTargetTaxa}>
                                    Include off-target taxa?
                                </Checkbox>
                            </Form.Item>
                            <Form.Item style={{ marginBottom: 0 }}>
                                <div style={{ display: "flex", gap: 12, width: "100%", alignItems: "baseline" }}>
                                    <Button
                                        type="primary"
                                        icon={<SearchOutlined />}
                                        disabled={!nCheckedLeaves || searching.current}
                                        loading={searching.current}
                                        onClick={onSearch}
                                    >
                                        Search
                                    </Button>
                                    <div style={{ flex: 1 }}>
                                        {hasSearched && (
                                            <Progress
                                                percent={progress}
                                                showInfo={true}
                                                format={(percent) => `${(percent ?? 0).toFixed(0)}%`}
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
                        <Title level={3} style={{ flex: 1, marginTop: 0 }}>
                            Results
                        </Title>
                        <Button
                            disabled={!results}
                            onClick={showPrimerSetCoverageModal}
                            icon={<BarChartOutlined />}
                        >
                            Cumulative Primer Pair Set Coverage
                        </Button>
                    </div>
                    {!hasSearched && (
                        <Alert
                            message="No results yet"
                            description={
                                <span>
                                    Select taxa, choose your desired maximum number of primers, and press "Search"
                                    in order to see corresponding primer pair sets. Searching may take a few
                                    seconds.
                                </span>
                            }
                            type="info"
                            showIcon={true}
                        />
                    )}
                    {searching.current && <Spin size="large" spinning={true} />}
                    {!!results && resultParams && (
                        <ResultsTabs dataset={dataset} results={results} resultParams={resultParams} />
                    )}
                </Col>
            </Row>

            <Divider />

            <Row>
                <Col flex={1}>
                    <Button size="large" icon={<ArrowLeftOutlined />} onClick={onBack}>
                        Back
                    </Button>
                </Col>
            </Row>

            <Modal
                title="Select Taxa"
                open={taxaSelectModalVisible}
                onCancel={hideTaxaSelectModal}
                width={800}
                okText="Done"
                footer={[
                    <Button key="done" type="primary" onClick={hideTaxaSelectModal}>
                        Done
                    </Button>,
                ]}
            >
                <Space direction="vertical">
                    <Space direction="horizontal">
                        {nCheckedLeaves} entries selected
                        <Button size="small" onClick={selectAll}>
                            Select All
                        </Button>
                        <Button size="small" onClick={deselectAll}>
                            Deselect All
                        </Button>
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

            {results && resultParams && (
                <Modal
                    title="Cumulative Primer Pair Set Coverage"
                    open={primerSetCoverageModalVisible}
                    width={900}
                    footer={null}
                    onCancel={hidePrimerSetCoverageModal}
                >
                    <CumulativePrimerSetCoverageChart
                        dataset={dataset}
                        results={results}
                        resultParams={resultParams}
                    />
                </Modal>
            )}
        </>
    );
};

export default DiscoverStep;
