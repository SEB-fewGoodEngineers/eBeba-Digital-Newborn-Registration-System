import { useState } from "react";
import ChildCare from "@mui/icons-material/ChildCareOutlined";

export default function RecordPair({ records, heading, name, caption, summary, details, detailTitle }) {
  const [selectedId, setSelectedId] = useState(null);
  const selected = records.find((item) => item._id === selectedId) || records[0];
  if (!selected) return null;
  return <div className="record-pair">
    <section className="record-sheet"><h2>{heading} ({records.length})</h2>
      {records.map((item) => <button className="record-option" key={item._id} type="button"
        aria-pressed={item._id === selected._id} onClick={() => setSelectedId(item._id)}>
        <ChildCare /><span><strong>{name(item)}</strong><small>{caption(item)}</small></span>
        {summary(item)}
      </button>)}
    </section>
    <section className="record-sheet" aria-label="Record details">
      <h2 className="detail-heading">{detailTitle || <><ChildCare />{name(selected)}</>}</h2>{details(selected)}
    </section>
  </div>;
}
