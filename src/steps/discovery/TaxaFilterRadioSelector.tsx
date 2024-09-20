import { useEffect, useState } from "react";
import { Radio } from "antd";
import type { SNIPeTargetMode } from "../../lib/types";

type TaxaFilterRadioSelectorProps = {
    includeOffTargetTaxa: boolean;
    value: SNIPeTargetMode;
    onChange: (v: SNIPeTargetMode) => void;
};

const TaxaFilterRadioSelector = ({ includeOffTargetTaxa, value, onChange }: TaxaFilterRadioSelectorProps) => {
    const [innerValue, setInnerValue] = useState<SNIPeTargetMode>(value ?? "onTarget");

    useEffect(() => {
        if (onChange) onChange(innerValue);
    }, [innerValue]);

    return (
        <Radio.Group size="small" onChange={(e) => setInnerValue(e.target.value)} value={innerValue}>
            <Radio.Button value="onTarget">On-Target</Radio.Button>
            <Radio.Button disabled={!includeOffTargetTaxa} value="offTarget">
                Off-Target
            </Radio.Button>
            <Radio.Button disabled={!includeOffTargetTaxa} value="total">
                Total
            </Radio.Button>
        </Radio.Group>
    );
};

export default TaxaFilterRadioSelector;
