import { type CSSProperties, Fragment, useCallback, useState } from "react";

import difference from "set.prototype.difference";

import { Button, Card, Space, Statistic, Typography } from "antd";
import { DownloadOutlined, MinusCircleOutlined, PlusCircleOutlined } from "@ant-design/icons";

import Primer from "../../shared/Primer";
import TaxaModal from "../../shared/TaxaModal";
import TaxaByPrimerModal from "./TaxaByPrimerModal";
import TaxonWithGroupAndPathPopover from "../../shared/TaxonWithGroupAndPathPopover";

import {
    BasePrimerGroupingRecord,
    CSV_HEADER,
    IntermediateLongFormDatasetRecord,
    RESOLUTIONS_WITH_SPECIES,
    type SNIPeDataset,
} from "../../lib/datasets";
import type { SNIPePrimerCombinationResult, SNIPePrimerSet, SNIPeSearchParams } from "../../lib/types";
import { pluralize, serializeCSVRow } from "../../lib/utils";

const { Title } = Typography;

type ChangedTaxaSet = {
    added: string[];
    removed: string[];
};

type ChangedTaxaSetsProps = {
    dataset: SNIPeDataset;
    changedTaxaSets: ChangedTaxaSet[];
    nextNPrimers: number;
};

const ChangedTaxaSets = ({ dataset, changedTaxaSets, nextNPrimers }: ChangedTaxaSetsProps) => {
    const nChangedTaxa = Array.from(new Set(changedTaxaSets.map((nts) => nts.added.length + nts.removed.length)));
    const allAdditions = changedTaxaSets.every((nts) => nts.removed.length === 0);

    return (
        <details open={changedTaxaSets[0].added.length + changedTaxaSets[0].removed.length < 8}>
            <summary style={{ cursor: "pointer" }}>
                {allAdditions ? "Adds" : "Changes"} {nChangedTaxa.join(" or ")}
                {allAdditions ? " new " : " "}
                {pluralize("taxon", Math.max(...nChangedTaxa))} vs. with {nextNPrimers}{" "}
                {pluralize("primer", nextNPrimers)}
            </summary>
            <>
                {changedTaxaSets.map((nts, ntsIndex) => (
                    <Fragment key={`taxa-set-${ntsIndex}`}>
                        {nts.added.map((t, ti) => (
                            <Fragment key={t}>
                                <span style={{ whiteSpace: "nowrap" }}>
                                    <PlusCircleOutlined style={{ color: "#7cb305" }} />{" "}
                                    <TaxonWithGroupAndPathPopover record={dataset.recordsByFinalID[t]} />
                                    {ti < nts.added.length + nts.removed.length - 1 ? ", " : ""}
                                </span>{" "}
                            </Fragment>
                        ))}
                        {nts.removed.map((t, ti) => (
                            <Fragment key={t}>
                                <span style={{ whiteSpace: "nowrap" }}>
                                    <MinusCircleOutlined style={{ color: "#d4380d" }} />{" "}
                                    <TaxonWithGroupAndPathPopover record={dataset.recordsByFinalID[t]} />
                                    {ti < nts.removed.length - 1 ? ", " : ""}
                                </span>
                            </Fragment>
                        ))}
                        {ntsIndex < changedTaxaSets.length - 1 ? (
                            <div>
                                <strong>— OR —</strong>
                            </div>
                        ) : null}
                    </Fragment>
                ))}
            </>
        </details>
    );
};

type PrimerSetProps = {
    dataset: SNIPeDataset;
    primerSet: SNIPePrimerSet;
    resultParams: SNIPeSearchParams;
    nextTabResults?: SNIPePrimerCombinationResult;
    style?: CSSProperties;
    onShowSetDiagram: () => void;
};

const PrimerSet = ({
    dataset,
    primerSet,
    resultParams,
    nextTabResults,
    style,
    onShowSetDiagram,
}: PrimerSetProps) => {
    const [taxaModalVisible, setTaxaModalVisible] = useState(false);
    const [taxaByPrimerModalVisible, setTaxaByPrimerModalVisible] = useState(false);

    const title = `Primer pair set ${primerSet.id}`;

    const nextTabPrimerSets = nextTabResults?.results ?? null;
    const nextTabNPrimers = nextTabResults?.nPrimers;

    const { coverage, coveredTaxa } = primerSet.onTarget;

    const changedTaxaSets: ChangedTaxaSet[] = (nextTabPrimerSets || []).map((ntps) => ({
        added: Array.from(difference(coveredTaxa, ntps.onTarget.coveredTaxa) as Set<string>).sort(),
        removed: Array.from(difference(ntps.onTarget.coveredTaxa, coveredTaxa) as Set<string>).sort(),
    }));

    const newPrimerSets = nextTabPrimerSets
        ? nextTabPrimerSets.map((ntps) => difference(primerSet.primers, ntps.primers))
        : [];

    const downloadPrimerSet = useCallback(() => {
        const longFormRecords = Array.from(coveredTaxa).flatMap((id) => {
            const compoundRecord = dataset.recordsByFinalID[id];

            // TODO: nicer type conversion
            const baseRecord = { ...compoundRecord } as Record<string, string | string[] | undefined>;
            delete baseRecord["primers"];
            delete baseRecord["primersLower"];
            delete baseRecord["key"];
            delete baseRecord["Resolution"];

            return compoundRecord.primers
                .filter((p) => primerSet.primers.has(p))
                .map(
                    (p) =>
                        ({
                            ...(baseRecord as BasePrimerGroupingRecord),
                            Primer_name: p,
                        }) as IntermediateLongFormDatasetRecord,
                );
        });

        const el = document.createElement("a");
        el.href = URL.createObjectURL(
            new Blob(
                [
                    serializeCSVRow(CSV_HEADER),
                    ...longFormRecords.map((rec) => serializeCSVRow(CSV_HEADER.map((h) => rec[h]))),
                ],
                { type: "text/csv" },
            ),
        );
        el.setAttribute("download", title.replace(/\s+/g, "_") + ".csv");
        el.click();
        el.remove();
    }, []);

    return (
        <>
            <Card
                title={title}
                size="small"
                style={style}
                extra={
                    <Space direction="horizontal" size={12}>
                        <span>Download filtered data:</span>
                        <Button size="small" icon={<DownloadOutlined />} onClick={downloadPrimerSet}>
                            On-target {/* TODO: options for downloading with off-target data */}
                        </Button>
                    </Space>
                }
            >
                <Space direction="vertical" size={16}>
                    <div>
                        <Title level={5} style={{ marginTop: 0 }}>
                            Primers
                        </Title>
                        {Array.from(primerSet.primers).map((p) => (
                            <Primer
                                key={p}
                                name={p}
                                added={
                                    newPrimerSets.reduce((acc, x) => acc || x.has(p), false)
                                        ? {
                                              sometimes: !newPrimerSets.reduce((acc, x) => acc && x.has(p), true),
                                              primerSetCount: primerSet.nPrimers,
                                          }
                                        : undefined
                                }
                            />
                        ))}
                    </div>
                    <div>
                        <Title level={5} style={{ marginTop: 0 }}>
                            Taxa:{" "}
                            <span style={{ fontWeight: "normal" }}>
                                {coverage} on-target{" "}
                                {nextTabPrimerSets ? `(+${coverage - nextTabPrimerSets[0].onTarget.coverage})` : ""}
                                {resultParams.includeOffTargetTaxa ? (
                                    <>
                                        ;{" "}
                                        <em style={{ color: "#8C8C8C" }}>
                                            {primerSet.offTarget?.coverage ?? 0} off-target
                                        </em>
                                    </>
                                ) : null}
                            </span>{" "}
                            <Button size="small" onClick={() => setTaxaModalVisible(true)}>
                                See list
                            </Button>{" "}
                            <Button size="small" onClick={() => setTaxaByPrimerModalVisible(true)}>
                                Plot
                            </Button>
                        </Title>
                        {nextTabNPrimers !== undefined && changedTaxaSets.length ? (
                            <ChangedTaxaSets
                                dataset={dataset}
                                changedTaxaSets={changedTaxaSets}
                                nextNPrimers={nextTabNPrimers}
                            />
                        ) : null}
                    </div>
                    <div>
                        <Button onClick={onShowSetDiagram} disabled={primerSet.primers.size > 6}>
                            Show set diagram
                            {primerSet.primers.size > 6 ? <em> (Not available for &gt;6 primers)</em> : ""}
                        </Button>
                    </div>
                    <div>
                        <Title level={5} style={{ marginTop: 0 }}>
                            Resolution{" "}
                            <span style={{ fontWeight: "normal", fontStyle: "italic" }}>(on-target)</span>
                        </Title>
                        <Space direction="horizontal">
                            {RESOLUTIONS_WITH_SPECIES.map((r) => (
                                <Statistic key={r} title={r} value={primerSet.onTarget.resolutionSummary[r]} />
                            ))}
                        </Space>
                    </div>
                </Space>
            </Card>

            <TaxaModal
                dataset={dataset}
                result={{ primerSet, resultParams }}
                open={taxaModalVisible}
                onCancel={() => setTaxaModalVisible(false)}
            />

            <TaxaByPrimerModal
                dataset={dataset}
                primerSet={primerSet}
                resultParams={resultParams}
                open={taxaByPrimerModalVisible}
                onCancel={() => setTaxaByPrimerModalVisible(false)}
            />
        </>
    );
};

export default PrimerSet;
