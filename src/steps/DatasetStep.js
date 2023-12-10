import { Fragment, useCallback, useEffect, useState } from "react";
import { parse } from "csv-parse/browser/esm";
import {
    Button,
    Col,
    Divider,
    message,
    Modal,
    Popover,
    Radio,
    Row,
    Space,
    Spin,
    Statistic,
    Typography,
    Upload
} from "antd";
import { ApartmentOutlined, ArrowRightOutlined, ExperimentOutlined, UploadOutlined } from "@ant-design/icons";
import { createDataset } from "../lib/datasets";
import Primer from "../bits/Primer";

const { Paragraph, Text } = Typography;

const EM_DASH = "—";

const beforeUploadNothing = () => false;

const parseDataset = async (csvGetter, onParseFinish=undefined) => {
    const csvContents = await csvGetter();

    return new Promise((resolve, reject) => {
        parse(csvContents, { columns: true }, (err, data) => {
            if (err) {
                reject(err);
                return;
            }

            if (onParseFinish) onParseFinish();

            const dataset = createDataset(data);
            console.debug("dataset:", dataset);
            resolve(dataset);
        });
    });
};

const DatasetStep = ({ visible, dataset, setDataset, onFinish }) => {
    const [messageApi, contextHolder] = message.useMessage();

    const [option, setOption] = useState(0);
    const [parsing, setParsing] = useState(false);
    const [fileObj, setFileObj] = useState(null);

    const [fetchingDefault, setFetchingDefault] = useState(false);
    const [fetchingDefaultFailed, setFetchingDefaultFailed] = useState(false);
    const [defaultDataset, setDefaultDataset] = useState(null);

    const parseDatasetInner = useCallback((csvGetter, onParseFinish=undefined) => {
        setParsing(true);
        return (async () => {
            try {
                setDataset(await parseDataset(csvGetter, onParseFinish));
            } finally {
                setParsing(false);
            }
        })();
    }, []);

    useEffect(() => {
        // On page load, fetch the default dataset
        setFetchingDefault(true);
        (async () => {
            try {
                const res = await fetch(
                    "/datasets/Tournayre_et_al_2023.csv",
                    { headers: { "Content-Type": "text/csv" } });
                const dd = await parseDataset(() => res.text());
                setDefaultDataset(dd);
            } catch (e) {
                const errStr = `Error fetching default dataset: ${e}`;
                console.error(errStr);
                messageApi.error(errStr)
                setOption(1);
                setFetchingDefaultFailed(true);
            } finally {
                setFetchingDefault(false);
            }
        })();
    }, [messageApi]);

    const [showFormatModal, setShowFormatModal] = useState(false);

    const onShowFormatModal = useCallback((e = undefined) => {
        if (e) e.preventDefault();
        setShowFormatModal(true);
    }, []);
    const hideFormatModal = useCallback(() => setShowFormatModal(false), []);

    const onUpload = useCallback((info) => {
        setFileObj(info.fileList[0]?.originFileObj ?? null);
    }, []);

    useEffect(() => {
        if (fileObj) {
            parseDatasetInner(() => fileObj.text(), () => setOption(1)).catch(console.error);
        }
    }, [fileObj, parseDatasetInner]);

    useEffect(() => {
        if (option === 0 && defaultDataset) {
            setDataset(defaultDataset);
        } else if (!fileObj && option === 1) {
            setDataset(null);  // no dataset selected yet; need to upload
        }
    }, [defaultDataset, fileObj, option]);

    const primers = dataset?.primers ?? [];

    if (!visible) return <Fragment />;
    return <>
        {contextHolder}
        <Row>
            <Col flex={1}>
                <Radio.Group value={option} onChange={(e) => setOption(e.target.value)} disabled={fetchingDefault}>
                    <Space direction="vertical">
                        <Radio value={0} disabled={fetchingDefaultFailed}>
                            <Spin spinning={fetchingDefault}>
                                Use primer dataset from Tournayre <em>et al.</em>
                            </Spin>
                        </Radio>
                        <Radio value={1}>
                            <Upload name="file" onChange={onUpload} beforeUpload={beforeUploadNothing}>
                                <Button icon={<UploadOutlined />}>Upload Taxa/Primer List</Button> <br />
                            </Upload>
                            <Text type="secondary">
                                You must upload a CSV which follows the tool's{" "}
                                <a href="#" onClick={onShowFormatModal}>formatting requirements</a>.
                            </Text>
                        </Radio>
                    </Space>
                </Radio.Group>
            </Col>
            <Col flex={1}>
                <Row gutter={24}>
                    <Col>
                        {primers.length ? (
                            <Popover content={
                                <div style={{ maxWidth: 480 }}>
                                    {primers.map((p) => <Primer key={p} name={p} />)}
                                </div>
                            }>
                                <Statistic
                                    title="Primers"
                                    value={primers.length ?? EM_DASH}
                                    loading={fetchingDefault || parsing}
                                    prefix={<ExperimentOutlined />}
                                    style={{ cursor: "pointer" }}
                                />
                            </Popover>
                        ) : (
                            <Statistic
                                title="Primers"
                                value={EM_DASH}
                                loading={fetchingDefault || parsing}
                                prefix={<ExperimentOutlined />}
                            />
                        )}
                    </Col>
                    <Col>
                        <Statistic
                            title="Taxa"
                            value={dataset?.records?.length ?? "—"}
                            loading={fetchingDefault || parsing}
                            prefix={<ApartmentOutlined />}
                        />
                    </Col>
                </Row>
            </Col>
        </Row>
        <Row>
            <Col flex={1}>
                <Paragraph style={{ marginTop: "1em", marginBottom: 0 }}>
                    <strong>Note:</strong> All processing is done on your local computer; datasets{" "}
                    <em>are not</em> sent to a remote server.
                </Paragraph>
            </Col>
        </Row>
        <Divider />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
                type="primary"
                size="large"
                icon={<ArrowRightOutlined />}
                loading={parsing}
                disabled={parsing || (option === 1 && dataset === null)}
                onClick={onFinish}
            >Next Step</Button>
        </div>
        <Modal
            open={showFormatModal}
            title="Dataset formatting requirements"
            onCancel={hideFormatModal}
            footer={null}
            width={960}
        >
            <Paragraph>
                SNIPE takes as input a CSV with eight columns:
            </Paragraph>
            <ul>
                <li>
                    <Text code={true}>Supergroup</Text>:
                    A top-level grouping (which may be sub-phylum or super-phylum), e.g., "Invertebrate". Used for
                    taxa tree and plot generation.
                </li>
                <li>
                    <Text code={true}>Taxa_group</Text>:
                    A sub-<Text code={true}>Supergroup</Text> grouping, possibly derived from the "class" taxonomic
                    rank, e.g., "Mammal", "Insecta". Primarily used for taxa tree and plot generation.
                </li>
                <li><Text code={true}>Phylum</Text></li>
                <li><Text code={true}>Family</Text></li>
                <li><Text code={true}>Genus</Text></li>
                <li><Text code={true}>Species</Text></li>
                <li>
                    <Text code={true}>Final_ID</Text>:
                    The final ID of the taxon for this row, e.g., <em>Castor_canadensis</em>,{" "}
                    <em>Castor_sp</em>, or Castoridae. This is usually (but not necessarily) species or genus-level.
                </li>
                <li>
                    <Text code={true}>Primer_name</Text>:
                    The name of the primer for this row, meaning that this primer can detect the presence of this taxon.
                </li>
            </ul>
            {/*<Paragraph>*/}
            {/*    TODO: Maximum number of different primers supported*/}
            {/*</Paragraph>*/}
            <Paragraph>
                This data should be "long-form", i.e., for each <Text code={true}>Final_ID</Text>, there may be multiple
                entries: one per primer.
            </Paragraph>
        </Modal>
    </>;
};

export default DatasetStep;
