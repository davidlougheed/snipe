import { useCallback, useMemo, useState } from "react";
import { Button, Space, Tree } from "antd";

const TaxaStep = ({ dataset }) => {
    const [checkedKeys, setCheckedKeys] = useState([]);

    const onCheck = useCallback((keys) => {
        console.log(keys);
        setCheckedKeys(keys);
    }, []);

    const numLeaves = useMemo(() => checkedKeys.filter((k) => k.endsWith("leaf")).length, [checkedKeys]);

    return <>
        <Space>
            <Button>Select Taxa &hellip;</Button>
            <span>{numLeaves} entries selected</span>
        </Space>
        <Tree
            checkable={true}
            showLine={true}
            treeData={dataset.tree}
            checkedKeys={checkedKeys}
            onCheck={onCheck}
        />
    </>;
};

export default TaxaStep;
