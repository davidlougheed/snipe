import type { MutableRefObject } from "react";
import { Button } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { downloadChart } from "../../download";

type ChartDownloadButtonsProps<T> = {
    chartRef: MutableRefObject<T | null>;
    fileNameBase: string;
    getter: (c: T) => HTMLElement;
};

const ChartDownloadButtons = <T,>({ chartRef, fileNameBase, getter }: ChartDownloadButtonsProps<T>) => (
    <div>
        Download:{" "}
        <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => {
                const cc = chartRef.current;
                if (cc) downloadChart(getter(cc), `${fileNameBase}.png`, "png");
            }}
        >
            PNG
        </Button>{" "}
        {/*<Button size="small" icon={<DownloadOutlined/>} onClick={() => {*/}
        {/*    const cc = chartRef.current;*/}
        {/*    if (cc) downloadChart(getter(cc), `${fileNameBase}.svg`, "svg");*/}
        {/*}}>SVG</Button>*/}
    </div>
);

export default ChartDownloadButtons;
