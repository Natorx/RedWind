import { useState } from "react";
import { getModuleNum } from "../utils/project";

const DrillGround: React.FC = () => {
  const [moduleNum, setModuleNum] = useState(getModuleNum);
  return (
    <div>
      {moduleNum}
    </div>
  );
};

export default DrillGround;