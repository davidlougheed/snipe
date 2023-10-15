import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Col, Divider, Form, InputNumber, Modal, Row, Space, Tree, Typography } from "antd";
import { ArrowLeftOutlined, ArrowRightOutlined } from "@ant-design/icons";

const TaxaStep = ({ dataset, onBack, onFinish }) => {
    const [modalVisible, selectModalVisible] = useState(false);

    const [expandedKeys, setExpandedKeys] = useState([]);
    const [checkedKeys, setCheckedKeys] = useState([]);

    const [nPrimers, setNPrimers] = useState(dataset.primers.length);

    const onCheck = useCallback((keys) => {
        setCheckedKeys(keys);
    }, []);

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

    /** @type React.ReactNode */
    const selectedNode = useMemo(
        () => <span>{checkedLeaves.length} entries selected</span>,
        [checkedLeaves],
    );

    useEffect(() => {
        const checkedRecords = checkedLeaves.map((key) => dataset.recordsByKey[key]);
        const primerSubset = new Set(checkedRecords.map((rec) => rec["Primer_name"]));

        console.log(checkedRecords);
        console.log(primerSubset);
    }, [dataset, checkedLeaves]);

    const showModal = useCallback(() => selectModalVisible(true), []);
    const hideModal = useCallback(() => selectModalVisible(false), []);

    // noinspection JSCheckFunctionSignatures
    return <>
        <Row gutter={[24, 24]}>
            <Col md={24} lg={10} xl={8}>
                <Card title="Criteria">
                    <Form layout="vertical">
                        <Form.Item label="Taxa">
                            <Space>
                                <Button onClick={showModal}>Select Taxa &hellip;</Button>
                                {selectedNode}
                            </Space>
                        </Form.Item>
                        <Form.Item
                            label="Max. Primers"
                            style={{ marginBottom: 0 }}
                            help={
                                `If this value is higher than the number of primers needed, only the fewest needed 
                                primers will be used.`
                            }
                        >
                            <InputNumber
                                min={1}
                                max={dataset.primers.length}
                                value={nPrimers}
                                onChange={(v) => setNPrimers(v)}
                            />
                        </Form.Item>
                    </Form>
                </Card>
            </Col>
            <Col md={24} lg={14} xl={16}>
                <Typography.Title level={3}>Results</Typography.Title>
                {checkedKeys.length === 0 && (
                    <Alert
                        message="No results yet"
                        description={<span>Select taxa in order to see corresponding primer sets.</span>}
                        type="info"
                        showIcon={true}
                    />
                )}
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
                {selectedNode}
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
        <Divider />
        <Row>
            <Col flex={1}>
                <Button size="large" icon={<ArrowLeftOutlined />} onClick={onBack}>Back</Button>
            </Col>
            <Col flex={1} style={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                    type="primary"
                    size="large"
                    icon={<ArrowRightOutlined />}
                    disabled={checkedKeys.length === 0}
                    onClick={() => onFinish()}
                >Next Step</Button>
            </Col>
        </Row>
    </>;
};

export default TaxaStep;
