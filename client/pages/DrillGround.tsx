import { invoke } from "@tauri-apps/api/core";
const DrillGround: React.FC = () => {
  const read_doc = invoke('read_document');
  const export_doc = invoke('export_markdown');
  return (
    <div>
      
    </div>
  );
};

export default DrillGround;