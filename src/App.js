import {Card, Divider, Layout, Steps, Typography, Upload} from "antd";
import {useMemo, useState} from "react";
import DatasetStep from "./steps/DatasetStep";
import TaxaStep from "./steps/TaxaStep";
import MatchesStep from "./steps/MatchesStep";
import DownloadStep from "./steps/DownloadStep";

const stepItems = [
    {
        title: <strong>Choose or upload a dataset</strong>,
        description: "Use the default primer dataset or upload your own.",
    },
    {
        title: <strong>Choose taxa and max. # primers</strong>,
        description: "Choose the taxa you wish to detect the presence of.",
    },
    {
        title: <strong>Find matching primer sets</strong>,
        description: "See which primer sets match your criteria.",
    },
    {
        title: <strong>Download results</strong>,
        description: "Obtain a report of your selected primer sets.",
    },
];

const App = () => {
    const [currentStep, setCurrentStep] = useState(0);

    /** @type ReactNode */
    const stepNode = useMemo(() => {
       switch (currentStep) {
           case 0:
               return <DatasetStep onFinish={() => {
                   setCurrentStep(1);
               }} />;
           case 1:
               return <TaxaStep />;
           case 2:
               return <MatchesStep />;
           case 3:
               return <DownloadStep />;
           default:
               return <div />;
       }
    }, [currentStep]);

    return <Layout>
        <Layout.Content style={{height: "100vh", padding: 36}}>
            <div style={{maxWidth: 1250, margin: "0 auto"}}>
                <Card>
                    <Typography.Title level={1}>eDNA Primer Selector</Typography.Title>
                    <Steps size="small" items={stepItems} current={currentStep} />
                    <Divider />
                    {stepNode}
                </Card>
                <div style={{marginTop: 24}}>
                    <Typography.Paragraph style={{color: "#8C8C8C"}}>
                        This web application is designed to complement Tournayre <em>et al.</em> 2023. The data
                        presented here were generated by{" "}
                        <a href="https://oriannetournayre.wixsite.com/website">Orianne Tournayre</a> and other members
                        of the{" "}
                        <a href="https://sclougheed.ca">Lougheed Lab</a>.
                        The web application component is &copy; <a href="https://dlougheed.com">David Lougheed</a> 2023;
                        the source code is available on Github under the terms of the GPL v3 license.
                    </Typography.Paragraph>
                </div>
            </div>
        </Layout.Content>
    </Layout>;
};

export default App;
