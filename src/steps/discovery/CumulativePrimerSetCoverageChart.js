import { useMemo, useRef, useState } from "react";

import { Card, Divider, Radio, Space } from "antd";

import { Bar, BarChart, CartesianGrid, Label, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { supergroupOrGroupColor } from "../../colors";
import ChartDownloadButtons from "./ChartDownloadButtons";
import TaxaFilterRadioSelector from "./TaxaFilterRadioSelector";

const CustomTooltip = ({ active, payload, currentBar, coordinate }) => {
    if (!currentBar) return null;

    const data = payload.find((p) => p.dataKey === currentBar);

    if (!active || !data) return null;
    return (
        <div style={{ position: "absolute", top: coordinate.y, left: coordinate.x }}>
            <Card
                size="small"
                styles={{ body: { padding: "6px 12px", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)" } }}
            >
                <strong>{data.payload.name}&nbsp;primers</strong>
                <br />
                {data.name}:&nbsp;{data.payload[currentBar]}
            </Card>
        </div>
    );
};

const CumulativePrimerSetCoverageChart = ({ dataset, results, resultParams }) => {
    const chartRef = useRef(null);

    const [barType, setBarType] = useState("group");
    const [resultFilter, setResultFilter] = useState("onTarget"); // onTarget | offTarget | total
    const [currentBar, setCurrentBar] = useState(null);

    const data = useMemo(() => {
        if (!results) return [];
        return results
            .map(
                ({
                    coverageFraction,
                    avgCoverageByGroup,
                    avgCoverageByGroupOffTarget,
                    avgCoverageByGroupTotal,
                    nPrimers,
                }) => {
                    let acByG = avgCoverageByGroup;
                    if (resultFilter === "offTarget") acByG = avgCoverageByGroupOffTarget;
                    if (resultFilter === "total") acByG = avgCoverageByGroupTotal;
                    return {
                        name: nPrimers.toString(),
                        coverageFraction,
                        ...Object.fromEntries(
                            Object.entries(dataset?.supergroupGroups ?? {})
                                .map(([sg, gs]) => [
                                    `supergroup_${sg}`,
                                    gs.reduce((acc, g) => acc + (acByG[g] ?? 0), 0),
                                ])
                                .filter(([_, v]) => !!v),
                        ),
                        ...Object.fromEntries(
                            Object.entries(acByG)
                                .map(([g, v]) => [`group_${g}`, v])
                                .filter(([_, v]) => !!v),
                        ),
                    };
                },
            )
            .reverse();
    }, [dataset, results, resultFilter]);

    return (
        <>
            <Space direction="horizontal" size={24}>
                <div>
                    <span>Level:</span>{" "}
                    <Radio.Group size="small" onChange={(e) => setBarType(e.target.value)} value={barType}>
                        <Radio.Button value="supergroup">Supergroup</Radio.Button>
                        <Radio.Button value="group">Group</Radio.Button>
                    </Radio.Group>
                </div>
                <div>
                    <span>Result taxa:</span>{" "}
                    <TaxaFilterRadioSelector
                        value={resultFilter}
                        onChange={(v) => setResultFilter(v)}
                        includeOffTargetTaxa={resultParams.includeOffTargetTaxa}
                    />
                </div>
                <div>
                    <span>Summarization:</span> Average
                </div>
                <ChartDownloadButtons
                    chartRef={chartRef}
                    fileNameBase="cumulative_primer_set_coverage"
                    getter={(cc) => cc.container}
                />
            </Space>
            <Divider />
            <ResponsiveContainer width="100%" height={550}>
                <BarChart
                    data={data}
                    margin={{ top: 8, bottom: 32, left: 16 }}
                    style={{ backgroundColor: "white" }}
                    ref={chartRef}
                >
                    <CartesianGrid vertical={false} stroke="#EEEEEE" />
                    <XAxis dataKey="name">
                        <Label value="# primers" position="bottom" />
                    </XAxis>
                    <YAxis tickCount={8}>
                        <Label
                            value="coverage (# taxa)"
                            angle={-90}
                            position="left"
                            style={{ textAnchor: "middle" }}
                        />
                    </YAxis>
                    <Legend verticalAlign="bottom" wrapperStyle={{ minHeight: 88, bottom: 0 }} />
                    <Tooltip content={<CustomTooltip currentBar={currentBar} />} isAnimationActive={false} />
                    {barType === "group"
                        ? Object.entries(dataset?.supergroupGroups ?? {}).flatMap(([sg, gs]) =>
                              gs
                                  .filter((g) => data.find((d) => `${barType}_${g}` in d))
                                  .map((g) => {
                                      const color = supergroupOrGroupColor(dataset, sg, g);
                                      const k = `${barType}_${g}`;
                                      return (
                                          <Bar
                                              key={k}
                                              dataKey={k}
                                              name={g}
                                              stackId="a"
                                              fill={color}
                                              onMouseOver={() => setCurrentBar(k)}
                                              onMouseOut={() => setCurrentBar(null)}
                                          />
                                      );
                                  }),
                          )
                        : Object.keys(dataset?.supergroupGroups ?? {})
                              .filter((sg) => data.find((d) => `${barType}_${sg}` in d))
                              .map((sg) => {
                                  const color = supergroupOrGroupColor(dataset, sg);
                                  const k = `${barType}_${sg}`;
                                  return (
                                      <Bar
                                          key={k}
                                          dataKey={k}
                                          name={sg}
                                          stackId="supergroup"
                                          fill={color}
                                          onMouseOver={() => setCurrentBar(k)}
                                          onMouseOut={() => setCurrentBar(null)}
                                      />
                                  );
                              })}
                </BarChart>
            </ResponsiveContainer>
        </>
    );
};

export default CumulativePrimerSetCoverageChart;
