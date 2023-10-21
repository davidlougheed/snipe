import { Fragment, useCallback, useEffect, useState } from "react";
import { parse } from "csv-parse/browser/esm";
import { Button, Col, Divider, message, Modal, Radio, Row, Space, Spin, Statistic, Typography, Upload } from "antd";
import { ApartmentOutlined, ArrowRightOutlined, ExperimentOutlined, UploadOutlined } from "@ant-design/icons";
import { createDataset } from "../lib/datasets";

const { Paragraph, Text } = Typography;

const EM_DASH = "—";

const DatasetStep = ({ visible, dataset, setDataset, onFinish }) => {
    const [messageApi, contextHolder] = message.useMessage();

    const [option, setOption] = useState(0);
    const [parsing, setParsing] = useState(false);
    const [fetchingDefault, setFetchingDefault] = useState(false);
    const [fetchingDefaultFailed, setFetchingDefaultFailed] = useState(false);

    useEffect(() => {
        // On page load, fetch the default dataset
        setFetchingDefault(true);
        (async () => {
            try {
                const res = await fetch(
                    "/datasets/Tournayre_et_al_2023.json",
                    { headers: { "Content-Type": "application/json" } });
                const data = await res.json();
                setDataset(data);
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

    if (!visible) return <Fragment />;
    return <>
        {contextHolder}
        <Row>
            <Col flex={1}>
                <Radio.Group value={option} onChange={(e) => setOption(e.target.value)} disabled={fetchingDefault}>
                    <Space direction="vertical">
                        <Radio value={0} disabled={fetchingDefaultFailed}>
                            <Spin spinning={fetchingDefault}>
                                Use primer dataset from Tournayre <em>et al.</em> (2023)
                            </Spin>
                        </Radio>
                        <Radio value={1}>
                            <Upload name="file" onChange={(info) => {
                                const fileObj = info.fileList[0]?.originFileObj;
                                if (!fileObj) return;

                                setParsing(true);

                                (async () => {
                                    try {
                                        // noinspection JSUnresolvedReference
                                        const csvContents = await fileObj.text();

                                        parse(csvContents, { columns: true }, (err, data) => {
                                            if (err) throw err;

                                            setOption(1);

                                            const dataset = createDataset(data);
                                            console.log(dataset);
                                            setDataset(dataset);
                                        });
                                    } finally {
                                        setParsing(false);
                                    }
                                })();
                            }} beforeUpload={() => false}>
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
                        <Statistic
                            title="Primers"
                            value={dataset?.primers?.length ?? EM_DASH}
                            loading={parsing}
                            prefix={<ExperimentOutlined />}
                        />
                    </Col>
                    <Col>
                        <Statistic
                            title="Taxa"
                            value={dataset?.records?.length ?? "—"}
                            loading={parsing}
                            prefix={<ApartmentOutlined />}
                        />
                    </Col>
                </Row>
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
                    <Text code={true}>Taxa_group</Text>:
                    A top-level grouping (which may be sub-phylum or super-phylum), e.g., "Invertebrates" or "Mammals".
                </li>
                <li><Text code={true}>Phylum</Text></li>
                <li><Text code={true}>Family</Text></li>
                <li><Text code={true}>Genus</Text></li>
                <li><Text code={true}>Species</Text></li>
                <li>
                    <Text code={true}>Final_ID</Text>:
                    The final ID of the taxon for this row, e.g., <em>Castor canadensis</em>,{" "}
                    <em>Castor sp.</em>, or "Castoridae".
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
