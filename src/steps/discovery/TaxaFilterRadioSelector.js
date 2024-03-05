import { useEffect, useState } from "react";
import { Radio } from "antd";

const TaxaFilterRadioSelector = ({ includeOffTargetTaxa, value, onChange }) => {
    const [innerValue, setInnerValue] = useState(value ?? "onTarget");

    useEffect(() => {
        if (onChange) onChange(innerValue);
    }, [innerValue]);

    return (
        <Radio.Group size="small" onChange={(e) => setInnerValue(e.target.value)} value={innerValue}>
            <Radio.Button value="onTarget">On-Target</Radio.Button>
            <Radio.Button disabled={!includeOffTargetTaxa} value="offTarget">Off-Target</Radio.Button>
            <Radio.Button disabled={!includeOffTargetTaxa} value="total">Total</Radio.Button>
        </Radio.Group>
    );
};

export default TaxaFilterRadioSelector;
