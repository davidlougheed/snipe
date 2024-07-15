import { useCallback, useMemo, useState } from "react";
import { Card, Divider, Layout, Steps, Typography } from "antd";

import { PrimerPaletteContext } from "./colors";
import DatasetStep from "./steps/dataset/DatasetStep";
import DiscoverStep from "./steps/discovery/DiscoverStep";
import Footer from "./Footer";

import logo from "./logo_square.svg";

const { Title } = Typography;

const styles = {
    content: { minHeight: "100vh", padding: 36 },
    contentInner: { maxWidth: 1400, margin: "0 auto" },
    titleContainer: { display: "flex", justifyContent: "center", alignItems: "center", marginBottom: 16 },
    logoContainer: { paddingTop: 6, marginRight: "0.3rem" },
    title: { fontStyle: "italic", fontWeight: 300, marginBottom: 0, marginRight: "1.5rem" },
    subtitle: { fontSize: 18, fontStyle: "italic", color: "#5F5F5F" },
    stepWrapper: { maxWidth: 600, margin: "0 auto" },
};

const stepItems = [
    { title: <strong>Choose or upload a dataset</strong> },
    { title: <strong>Discover primer pair sets</strong> },
];

const App = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const [dataset, setDataset] = useState(null);

    const onBack = useCallback(() => setCurrentStep(Math.max(0, currentStep - 1)), [currentStep]);
    const onNext = useCallback(
        () => setCurrentStep(Math.min(stepItems.length, currentStep + 1)),
        [currentStep]);

    /** @type ReactNode */
    const stepNode = useMemo(() => (
       <>
           <DatasetStep visible={currentStep === 0} dataset={dataset} setDataset={setDataset} onFinish={onNext} />
           <DiscoverStep visible={currentStep === 1} dataset={dataset} onBack={onBack} />
       </>
    ), [currentStep, dataset]);

    return <Layout>
        <Layout.Content style={styles.content}>
            <div style={styles.contentInner}>
                <Card>
                    <div style={styles.titleContainer}>
                        <div style={styles.logoContainer}>
                            <img src={logo} alt="" height={64} width={64} />
                        </div>
                        <Title level={1} style={styles.title}>SNIPe</Title>
                        <span style={styles.subtitle}>
                            <strong>S</strong>electing{" "}
                            <strong>N</strong>ovel{" "}
                            <strong>I</strong>nformative{" "}
                            <strong>P</strong>rimer-sets for{" "}
                            <strong>e</strong>-DNA
                        </span>
                    </div>
                    <div style={styles.stepWrapper}>
                        <Steps size="small" items={stepItems} current={currentStep} />
                    </div>
                    <Divider />
                    <PrimerPaletteContext.Provider value={dataset?.primerPalette}>
                        {stepNode}
                    </PrimerPaletteContext.Provider>
                </Card>
                <Footer />
            </div>
        </Layout.Content>
    </Layout>;
};

export default App;
