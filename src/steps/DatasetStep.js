import {useState} from "react";
import {parse} from "csv-parse/browser/esm";
import {Button, Col, Divider, Radio, Row, Space, Statistic, Upload} from "antd";
import {ApartmentOutlined, ArrowRightOutlined, ExperimentOutlined, UploadOutlined} from "@ant-design/icons";

const DatasetStep = ({onFinish}) => {
    const [option, setOption] = useState(0);
    const [dataset, setDataset] = useState(null);

    return <>
        <Row>
            <Col flex={1}>
                <Radio.Group value={option} onChange={(e) => setOption(e.target.value)}>
                    <Space direction="vertical">
                        <Radio value={0}>
                            Use primer dataset from Tournayre <em>et al.</em> (2023)
                        </Radio>
                        <Radio value={1}>
                            <Upload name="file" onChange={(info) => {
                                console.log(info);

                                const fileObj = info.fileList[0]?.originFileObj;
                                if (!fileObj) return;

                                (async () => {
                                    // noinspection JSUnresolvedReference
                                    const csvContents = await fileObj.text();

                                    parse(csvContents, {}, (err, data) => {
                                        if (err) throw err;

                                        setOption(1);
                                        setDataset(data);
                                        console.log(data);
                                    });
                                })();
                            }} beforeUpload={() => false}>
                                <Button icon={<UploadOutlined />}>Upload Primer/Taxa Matrix</Button>
                            </Upload>
                        </Radio>
                    </Space>
                </Radio.Group>
            </Col>
            <Col flex={1}>
                <Row gutter={24}>
                    <Col>
                        <Statistic title="Primers" value={"TODO"} prefix={<ExperimentOutlined />} />
                    </Col>
                    <Col>
                        <Statistic title="Taxa" value={"TODO"} prefix={<ApartmentOutlined />} />
                    </Col>
                </Row>
            </Col>
        </Row>
        <Divider />
        <div style={{display: "flex", justifyContent: "flex-end"}}>
            <Button
                type="primary"
                size="large"
                icon={<ArrowRightOutlined />}
                disabled={option === 1 && dataset === null}
                onClick={() => onFinish(dataset)}
            >Next Step</Button>
        </div>
    </>;
};

export default DatasetStep;
