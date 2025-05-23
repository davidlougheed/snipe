import { Fragment, MouseEventHandler, useCallback, useEffect, useState } from "react";
import { parse } from "csv-parse/browser/esm";
import {
    Alert,
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
    Upload,
} from "antd";
import type { RcFile, UploadChangeParam } from "antd/es/upload/interface";
import { ApartmentOutlined, ArrowRightOutlined, ExperimentOutlined, UploadOutlined } from "@ant-design/icons";
import { createDataset, type SNIPeDataset } from "@lib/datasets";
import Primer from "@shared/Primer";
import TaxaModal from "@shared/TaxaModal";

const { Paragraph, Text } = Typography;

const EM_DASH = "—";

const beforeUploadNothing = () => false;

type Delimiter = ";" | "\t" | ",";

const getDelimiterFromHeaderLine = (rawHeader: string): Delimiter => {
    const nComma = (rawHeader.match(/,/g) || []).length;
    const nSemi = (rawHeader.match(/;/g) || []).length;
    const nTab = (rawHeader.match(/\t/g) || []).length;
    if (nSemi > nComma && nSemi) {
        return ";";
    } else if (nTab > nComma && nTab) {
        return "\t";
    } else {
        return ",";
    }
};

const parseDataset = async (
    csvGetter: () => Promise<string>,
    onParseFinish: (() => void) | undefined = undefined,
): Promise<SNIPeDataset> => {
    const csvContents = await csvGetter();

    const delimiter = getDelimiterFromHeaderLine(csvContents.split("\n")[0]);

    return new Promise((resolve, reject) => {
        parse(csvContents, { columns: true, delimiter }, (err, data) => {
            if (err) {
                reject(err);
                return;
            }

            if (onParseFinish) onParseFinish();

            try {
                const dataset = createDataset(data);
                console.debug("dataset:", dataset);
                resolve(dataset);
            } catch (e) {
                // Error in createDataset
                reject(e);
            }
        });
    });
};

type DatasetStepProps = {
    visible: boolean;
    dataset?: SNIPeDataset;
    setDataset: (dataset: SNIPeDataset | undefined) => void;
    onFinish: () => void;
};

const DatasetStep = ({ visible, dataset, setDataset, onFinish }: DatasetStepProps) => {
    const [messageApi, contextHolder] = message.useMessage();

    const [option, setOption] = useState(0);
    const [parsing, setParsing] = useState(false);
    const [parseError, setParseError] = useState<Error | null>(null);
    const [fileObj, setFileObj] = useState<RcFile | null>(null);
    const [taxaModalOpen, setTaxaModalOpen] = useState(false);

    const [fetchingDefault, setFetchingDefault] = useState(false);
    const [fetchingDefaultFailed, setFetchingDefaultFailed] = useState(false);
    const [defaultDataset, setDefaultDataset] = useState<SNIPeDataset | null>(null);

    const parseDatasetInner = useCallback(
        (csvGetter: () => Promise<string>, onParseFinish: (() => void) | undefined = undefined) => {
            setParseError(null);
            setParsing(true);
            return (async () => {
                try {
                    setDataset(await parseDataset(csvGetter, onParseFinish));
                } catch (e) {
                    console.error("Encountered error while parsing dataset:", e);
                    setParseError(e as Error);
                    setDataset(undefined);
                } finally {
                    setParsing(false);
                }
            })();
        },
        [],
    );

    useEffect(() => {
        // On page load, fetch the default dataset
        setFetchingDefault(true);
        (async () => {
            try {
                const res = await fetch("/datasets/Tournayre_et_al_2023.csv", {
                    headers: { "Content-Type": "text/csv" },
                });
                const dd = await parseDataset(() => res.text());
                setDefaultDataset(dd);
            } catch (e) {
                const errStr = `Error fetching default dataset: ${e}`;
                console.error(errStr);
                messageApi.error(errStr);
                setOption(1);
                setFetchingDefaultFailed(true);
            } finally {
                setFetchingDefault(false);
            }
        })();
    }, [messageApi]);

    const [showFormatModal, setShowFormatModal] = useState(false);

    const onShowFormatModal = useCallback<MouseEventHandler<HTMLAnchorElement>>((e) => {
        if (e) e.preventDefault();
        setShowFormatModal(true);
    }, []);
    const hideFormatModal = useCallback(() => setShowFormatModal(false), []);

    const onUpload = useCallback((info: UploadChangeParam) => {
        setFileObj(info.fileList[0]?.originFileObj ?? null);
    }, []);

    useEffect(() => {
        if (fileObj) {
            parseDatasetInner(
                () => fileObj.text(),
                () => setOption(1),
            ).catch(console.error);
        }
    }, [fileObj, parseDatasetInner]);

    useEffect(() => {
        if (option === 0 && defaultDataset) {
            setDataset(defaultDataset);
        } else if ((!fileObj || parseError) && option === 1) {
            setDataset(undefined); // either: no dataset selected yet, need to upload; or: invalid dataset
        }
    }, [defaultDataset, fileObj, option]);

    const primers = dataset?.primers ?? [];
    const haveTaxaRecords = !!dataset?.records.length;

    if (!visible) return <Fragment />;
    return (
        <>
            {contextHolder}
            {parseError && (
                <Row style={{ marginBottom: 24 }}>
                    <Col flex={1}>
                        <Alert
                            type="error"
                            message="An error occurred while parsing the dataset."
                            description={parseError.toString()}
                        />
                    </Col>
                </Row>
            )}
            {haveTaxaRecords && (
                <TaxaModal dataset={dataset} open={taxaModalOpen} onCancel={() => setTaxaModalOpen(false)} />
            )}
            <Row gutter={[0, 12]}>
                <Col flex={1}>
                    <Radio.Group
                        value={option}
                        onChange={(e) => setOption(e.target.value)}
                        disabled={fetchingDefault}
                    >
                        <Space direction="vertical">
                            <Radio value={0} disabled={fetchingDefaultFailed}>
                                <Spin spinning={fetchingDefault}>
                                    Use primer dataset from{" "}
                                    <a
                                        target="_blank"
                                        rel="noreferrer noopener"
                                        href="https://onlinelibrary.wiley.com/doi/10.1002/edn3.590"
                                    >
                                        Tournayre <em>et al.</em>
                                    </a>
                                </Spin>
                            </Radio>
                            <Radio value={1}>
                                <Upload
                                    name="file"
                                    onChange={onUpload}
                                    beforeUpload={beforeUploadNothing}
                                    maxCount={1}
                                >
                                    <Button icon={<UploadOutlined />}>Upload Taxa/Primer List</Button> <br />
                                </Upload>
                                <Text type="secondary">
                                    You must upload a CSV which follows the tool's{" "}
                                    <a href="#" onClick={onShowFormatModal}>
                                        formatting requirements
                                    </a>
                                    . <br />
                                    SNIPe can be used with any dataset which uses this format, including lists
                                    generated by in-silico analyses.
                                </Text>
                            </Radio>
                        </Space>
                    </Radio.Group>
                </Col>
                <Col flex={2}>
                    <Row gutter={24}>
                        <Col>
                            {primers.length ? (
                                <Popover
                                    content={
                                        <div style={{ maxWidth: 480 }}>
                                            {primers.map((p) => (
                                                <Primer key={p} name={p} />
                                            ))}
                                        </div>
                                    }
                                >
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
                        <Col
                            onClick={() => {
                                if (haveTaxaRecords) setTaxaModalOpen(true);
                            }}
                        >
                            <Statistic
                                className={haveTaxaRecords ? "clickable" : undefined}
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
                    <Paragraph style={{ marginTop: "1em" }}>
                        <strong>Note:</strong> All processing is done on your local computer; datasets{" "}
                        <em>are not</em> sent to a remote server.
                    </Paragraph>
                    <Divider />
                    <Paragraph>
                        SNIPe is a primer pair selection tool for environmental DNA / metabarcoding studies, and an
                        exploration tool for Tournayre <em>et al.</em>'s freshwater diversity metabarcoding dataset,
                        which can be used to find informative subsets of validated primer pairs that maximize
                        detection of taxa of interest.
                    </Paragraph>
                    <Paragraph>If you use SNIPe in your work, please cite:</Paragraph>
                    <Paragraph style={{ marginBottom: 0 }}>
                        <blockquote style={{ maxWidth: 800 }}>
                            <strong>
                                Enhancing metabarcoding of freshwater biotic communities: a new online tool for
                                primer selection and exploring data from 14 primer pairs
                            </strong>
                            <br />
                            Orianne&nbsp;Tournayre, Haolun&nbsp;Tian, David&nbsp;R.&nbsp;Lougheed,
                            Matthew&nbsp;J.S.&nbsp;Windle, Sheldon&nbsp;Lambert, Jennipher&nbsp;Carter,
                            Zhengxin&nbsp;Sun, Jeff&nbsp;Ridal, Yuxiang Wang, Brian&nbsp;F.&nbsp;Cumming,
                            Shelley&nbsp;E.&nbsp;Arnott, Stephen&nbsp;C.&nbsp;Lougheed. (2024).
                            <br />
                            <em>Environmental DNA</em> 6, e590; DOI:&nbsp;
                            <a href="https://doi.org/10.1002/edn3.590" target="_blank" rel="noreferrer">
                                10.1002/edn3.590
                            </a>
                        </blockquote>
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
                    disabled={parsing || (option === 1 && !dataset)}
                    onClick={onFinish}
                >
                    Next Step
                </Button>
            </div>
            <Modal
                open={showFormatModal}
                title="Dataset formatting requirements"
                onCancel={hideFormatModal}
                footer={null}
                width={960}
            >
                <Paragraph>SNIPE takes as input a CSV with eight columns:</Paragraph>
                <ul>
                    <li>
                        <Text code={true}>Supergroup</Text>: A top-level grouping (which may be sub-phylum or
                        super-phylum), e.g., "Invertebrate". Used for taxa tree and plot generation.
                    </li>
                    <li>
                        <Text code={true}>Taxa_group</Text>: A sub-<Text code={true}>Supergroup</Text> grouping,
                        possibly derived from the "class" taxonomic rank, e.g., "Mammal", "Insecta". Primarily used
                        for taxa tree and plot generation.
                    </li>
                    <li>
                        <Text code={true}>Phylum</Text>
                    </li>
                    <li>
                        <Text code={true}>Family</Text>
                    </li>
                    <li>
                        <Text code={true}>Genus</Text>
                    </li>
                    <li>
                        <Text code={true}>Species</Text>
                    </li>
                    <li>
                        <Text code={true}>Final_ID</Text>: The final ID of the taxon for this row, e.g.,{" "}
                        <em>Castor_canadensis</em>, <em>Castor_sp</em>, or Castoridae. This is usually (but not
                        necessarily) species or genus-level.
                    </li>
                    <li>
                        <Text code={true}>Primer_name</Text>: The name of the primer for this row, meaning that this
                        primer can detect the presence of this taxon.
                    </li>
                </ul>
                {/*<Paragraph>*/}
                {/*    TODO: Maximum number of different primers supported*/}
                {/*</Paragraph>*/}
                <Paragraph>
                    This data should be "long-form", i.e., for each <Text code={true}>Final_ID</Text>, there may be
                    multiple entries: one per primer.
                </Paragraph>
            </Modal>
        </>
    );
};

export default DatasetStep;
