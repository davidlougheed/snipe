import { useMemo, useState } from "react";
import { Divider, Radio, Space } from "antd";
import { Bar, BarChart, CartesianGrid, Label, Legend, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { hsl } from "d3-color";
import { schemeTableau10 } from "d3-scale-chromatic";

import TaxaFilterRadioSelector from "./TaxaFilterRadioSelector";

const CumulativePrimerSetCoverageChart = ({ dataset, results, resultParams }) => {
    const [barType, setBarType] = useState("group");
    const [resultFilter, setResultFilter] = useState("onTarget");  // onTarget | offTarget | total

    const data = useMemo(() => {
        if (!results) return [];
        return results.map(
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
                            .filter(([_, v]) => !!v)),
                    ...Object.fromEntries(
                        Object.entries(acByG)
                            .map(([g, v]) => [`group_${g}`, v])
                            .filter(([_, v]) => !!v)),
                };
            }
        ).reverse();
    }, [dataset, results, resultFilter]);

    return <>
        <Space direction="horizontal" size={16}>
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
                <span>Summarization:</span>{" "}Average
            </div>
        </Space>
        <Divider />
        <ResponsiveContainer width="100%" height={550}>
            <BarChart data={data} margin={{ top: 8, bottom: 32, left: 16 }}>
                <CartesianGrid vertical={false} stroke="#EEEEEE" />
                <XAxis dataKey="name">
                    <Label value="# primers" position="bottom" />
                </XAxis>
                <YAxis tickCount={8}>
                    <Label value="coverage (# taxa)" angle={-90} position="left" style={{ textAnchor: "middle" }} />
                </YAxis>
                {/*<Tooltip formatter={(value) => percentFormatter(value)} />*/}
                <Legend verticalAlign="bottom" wrapperStyle={{ minHeight: 88, bottom: 0 }} />
                {barType === "group" ? (
                    Object.entries(dataset?.supergroupGroups ?? {}).flatMap(([sg, gs]) =>
                        gs.filter((g) => data.find((d) => `${barType}_${g}` in d))
                            .map((g) => {
                                const color = hsl(schemeTableau10[dataset.supergroups.indexOf(sg)]);
                                color.l = 0.25 + ((gs.indexOf(g) + 1) / (gs.length + 1)) * 0.6;
                                const k = `${barType}_${g}`;
                                return <Bar key={k} dataKey={k} name={g} stackId="a" fill={color.toString()} />;
                            })
                    )
                ) : (
                    Object.keys(dataset?.supergroupGroups ?? {})
                        .filter((sg) => data.find((d) => `${barType}_${sg}` in d))
                        .map((sg) => {
                            const color = hsl(schemeTableau10[dataset.supergroups.indexOf(sg)]);
                            color.l = 0.55;  // normalize luminosity to be in the middle of where it is for group bars
                            const k = `${barType}_${sg}`;
                            return <Bar key={k} dataKey={k} name={sg} stackId="supergroup" fill={color.toString()} />;
                        })
                )}
            </BarChart>
        </ResponsiveContainer>
    </>;
};

export default CumulativePrimerSetCoverageChart;
