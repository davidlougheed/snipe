import { useMemo, useRef, useState } from "react";

import { Col, Empty, Modal, Row, Space } from "antd";
import groupBy from "lodash/groupBy";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { supergroupOrGroupColor } from "../../lib/colors";
import { COL_SUPERGROUP, COL_TAXA_GROUP, type DatasetRecord, type SNIPeDataset } from "../../lib/datasets";
import type { SNIPePrimerSet, SNIPeSearchParams, SNIPeTargetMode } from "../../lib/types";

import ChartDownloadButtons from "./ChartDownloadButtons";
import TaxaFilterRadioSelector from "../../shared/TaxaFilterRadioSelector";

type TaxaByPrimerModalProps = {
    dataset: SNIPeDataset;
    primerSet: SNIPePrimerSet;
    resultParams: SNIPeSearchParams;
    open: boolean;
    onCancel: () => void;
};

const TaxaByPrimerModal = ({ dataset, primerSet, resultParams, open, onCancel }: TaxaByPrimerModalProps) => {
    const [taxaTargetFilter, setTaxaTargetFilter] = useState<SNIPeTargetMode>("onTarget");

    const chartRef = useRef<HTMLDivElement>(null);
    const currentBar = useRef<string | null>(null);

    const records = useMemo<DatasetRecord[]>(() => {
        if (taxaTargetFilter === "onTarget") return primerSet.onTarget.coveredRecords;
        if (taxaTargetFilter === "offTarget") return primerSet.offTarget?.coveredRecords ?? [];
        return primerSet.total?.coveredRecords ?? [];
    }, [primerSet, taxaTargetFilter]);

    const supergroups = useMemo(() => [...new Set(records.map((r) => r[COL_SUPERGROUP]))].sort(), [records]);
    const data = useMemo(
        () =>
            Object.fromEntries(
                supergroups.map((sg) => [
                    sg,
                    Array.from(primerSet.primers)
                        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
                        .map((p) => ({
                            primer: p,
                            ...Object.fromEntries(
                                Object.entries(
                                    groupBy(
                                        records.filter((r) => r[COL_SUPERGROUP] === sg && r["primers"].includes(p)),
                                        COL_TAXA_GROUP,
                                    ),
                                ).map(([k, v]) => [k, v.length]),
                            ),
                        })),
                ]),
            ),
        [records, supergroups],
    );

    return (
        <Modal
            open={open}
            title={`Primer pair set ${primerSet.id}: Taxa by primers`}
            footer={null}
            width={920}
            style={{ top: 24 }}
            onCancel={onCancel}
        >
            <Space direction="vertical" style={{ width: "100%" }}>
                <Space direction="horizontal" size={16}>
                    <TaxaFilterRadioSelector
                        value={taxaTargetFilter}
                        onChange={(v) => setTaxaTargetFilter(v)}
                        includeOffTargetTaxa={resultParams.includeOffTargetTaxa}
                    />
                    <ChartDownloadButtons<HTMLDivElement>
                        chartRef={chartRef}
                        fileNameBase="taxa_by_primers"
                        getter={(x) => x}
                    />
                </Space>
                <div ref={chartRef} style={{ backgroundColor: "white", marginTop: 8 }}>
                    <Row gutter={[16, 8]}>
                        {!supergroups.length && <Empty />}
                        {supergroups.map((sg) => {
                            const groups = dataset.supergroupGroups[sg];
                            return (
                                <Col span={12} key={sg}>
                                    <h3>{sg}</h3>
                                    <ResponsiveContainer width="100%" height={180}>
                                        <BarChart data={data[sg]} margin={{ bottom: 50 }}>
                                            <CartesianGrid />
                                            <XAxis dataKey="primer" angle={-45} textAnchor="end" />
                                            <YAxis width={40} />
                                            <Tooltip
                                                isAnimationActive={false}
                                                allowEscapeViewBox={{ x: true, y: true }}
                                                wrapperStyle={{ backgroundColor: "white", zIndex: 10 }}
                                                itemStyle={{ paddingTop: 0, paddingBottom: 0 }}
                                            />
                                            {groups.map((g) => (
                                                <Bar
                                                    key={g}
                                                    dataKey={g}
                                                    name={g}
                                                    stackId="a"
                                                    fill={supergroupOrGroupColor(dataset, sg, g)}
                                                    onMouseOver={() => (currentBar.current = g)}
                                                    onMouseOut={() => {
                                                        if (currentBar.current === g) {
                                                            currentBar.current = null;
                                                        }
                                                    }}
                                                />
                                            ))}
                                        </BarChart>
                                    </ResponsiveContainer>
                                </Col>
                            );
                        })}
                    </Row>
                </div>
            </Space>
        </Modal>
    );
};

export default TaxaByPrimerModal;
