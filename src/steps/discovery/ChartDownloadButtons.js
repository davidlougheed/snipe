import { Button } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { downloadChart } from "../../download";

const ChartDownloadButtons = ({ chartRef, fileNameBase, getter }) => (
    <div>
        Download:{" "}
        <Button size="small" icon={<DownloadOutlined/>} onClick={() => {
            const cc = chartRef.current;
            if (cc) downloadChart(getter(cc), `${fileNameBase}.png`, "png");
        }}>PNG</Button>{" "}
        <Button size="small" icon={<DownloadOutlined/>} onClick={() => {
            const cc = chartRef.current;
            if (cc) downloadChart(getter(cc), `${fileNameBase}.svg`, "svg");
        }}>SVG</Button>
    </div>
);
ChartDownloadButtons.defaultProps = {
    getter: (c) => c,
};

export default ChartDownloadButtons;
