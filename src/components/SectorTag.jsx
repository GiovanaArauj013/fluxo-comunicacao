// Etiqueta colorida de setor. Sem setor, não mostra nada (tarefa geral).
export default function SectorTag({ sector }) {
  if (!sector) return null;
  return (
    <span
      title={`Setor: ${sector.name}`}
      style={{
        display: "inline-block", marginLeft: 6, padding: "1px 7px", borderRadius: 999,
        fontSize: 11, fontWeight: 600, lineHeight: "16px", whiteSpace: "nowrap",
        color: sector.color, background: `${sector.color}22`, border: `1px solid ${sector.color}55`,
      }}
    >
      {sector.name}
    </span>
  );
}
