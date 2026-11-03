import { useState } from "react";
import { COLUMNS } from "../data.js";
import Card from "./Card.jsx";

export default function Board({ items, onOpen, onMove, onNew }) {
  const [over, setOver] = useState(null);
  return (
    <div className="board">
      {COLUMNS.map((col) => {
        const list = items.filter((i) => i.status === col);
        return (
          <section
            key={col}
            className={`col ${over === col ? "over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setOver(col); }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => { e.preventDefault(); setOver(null); onMove(Number(e.dataTransfer.getData("id")), col); }}
          >
            <h3>{col} <span>{list.length}</span></h3>
            <div className="cards">
              {list.map((i) => <Card key={i.id} item={i} onOpen={onOpen} />)}
            </div>
            <button className="add" onClick={() => onNew(col)}>+ Criar item</button>
          </section>
        );
      })}
    </div>
  );
}
