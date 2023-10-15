import { Card, Divider, Layout, Steps, Typography } from "antd";
import { useMemo, useState } from "react";
import DatasetStep from "./steps/DatasetStep";
import DiscoverStep from "./steps/DiscoverStep";
// import MatchesStep from "./steps/MatchesStep";
import DownloadStep from "./steps/DownloadStep";

const stepItems = [
    {
        title: <strong>Choose or upload a dataset</strong>,
        description: "Use the default primer dataset or upload your own.",
    },
    // {
    //     title: <strong>Choose taxa and max. # primers</strong>,
    //     description: "Choose the taxa you wish to detect the presence of.",
    // },
    // {
    //     title: <strong>Find matching primer sets</strong>,
    //     description: "See which primer sets match your criteria.",
    // },
    {
        title: <strong>Discover primer sets</strong>,
        description: "Choose taxa for presence detection and find matching primer sets.",
    },
    {
        title: <strong>Download results</strong>,
        description: "Obtain a report of your selected primer sets.",
    },
];

const App = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const [dataset, setDataset] = useState(null);

    /** @type ReactNode */
    const stepNode = useMemo(() => {
       switch (currentStep) {
           case 0:
               return <DatasetStep onFinish={(dataset) => {
                   setDataset(dataset);
                   setCurrentStep(1);
               }} />;
           case 1:
               return <DiscoverStep dataset={dataset} />;
           case 3:
               return <DownloadStep />;
           default:
               return <div />;
       }
    }, [currentStep]);

    return <Layout>
        <Layout.Content style={{minHeight: "100vh", padding: 36}}>
            <div style={{maxWidth: 1400, margin: "0 auto"}}>
                <Card>
                    {/*<Typography.Title level={1}>eDNA Primer Selector</Typography.Title>*/}
                    <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center" }}>
                        <Typography.Title level={1} style={{ fontStyle: "italic", fontWeight: 300 }}>SNIPE</Typography.Title>
                        <span style={{ fontSize: 18, marginTop: 10, fontStyle: "italic", color: "#5F5F5F" }}>
                            <strong>S</strong>electing{" "}
                            <strong>N</strong>ovel{" "}
                            <strong>I</strong>nformative{" "}
                            <strong>P</strong>rimer-sets for{" "}
                            <strong>ᴇ</strong>-DNA
                        </span>
                    </div>
                    <Steps size="small" items={stepItems} current={currentStep} />
                    <Divider />
                    {stepNode}
                </Card>
                <div style={{marginTop: 24}}>
                    <Typography.Paragraph style={{color: "#8C8C8C"}}>
                        This web application is designed to complement Tournayre <em>et al.</em> 2023. The data
                        presented here were generated by{" "}
                        <a href="https://oriannetournayre.wixsite.com/website" target="_blank" rel="noreferrer">
                            Orianne Tournayre
                        </a> and other members
                        of the{" "}
                        <a href="https://sclougheed.ca" target="_blank" rel="noreferrer">Lougheed Lab</a>.
                        The web application component is &copy;{" "}
                        <a href="https://dlougheed.com" target="_blank" rel="noreferrer">David Lougheed</a> 2023;
                        the{" "}
                        <a href="https://github.com/davidlougheed/edna_primer_selector"
                           target="_blank"
                           rel="noreferrer">source code is available on Github</a>{" "}
                        under the terms of the GPL v3 license.
                    </Typography.Paragraph>
                </div>
            </div>
        </Layout.Content>
    </Layout>;
};

export default App;
