import { useState } from "react";
import { Modal, Tabs } from "antd";

import PrimerSet from "./PrimerSet";
import PrimerSetEulerDiagram from "./PrimerSetEulerDiagram";

import { pluralize } from "../../lib/utils";


const primerCountPhrase = (nPrimers) => `${nPrimers} ${pluralize("Primer", nPrimers)}`;


const ResultsTabs = ({ dataset, results, resultParams }) => {
    const [selectedPrimerSet, setSelectedPrimerSet] = useState(null);
    const [diagramModalVisible, setDiagramModalVisible] = useState(false);

    return (
        <>
            <Modal
                open={diagramModalVisible}
                title={`Primer set ${selectedPrimerSet?.id}: Euler diagram`}
                footer={null}
                destroyOnClose={true}
                width={1040}
                style={{ top: 30 }}
                onCancel={() => setDiagramModalVisible(false)}
            >
                {selectedPrimerSet ? <PrimerSetEulerDiagram primerSet={selectedPrimerSet} /> : null}
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

export default ResultsTabs;
