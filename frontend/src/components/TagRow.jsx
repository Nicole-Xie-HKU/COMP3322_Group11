import { useState } from "react";
import { Plus, X } from "lucide-react";

export default function TagRow({ tags = [], custom = [], onAdd, onRemove, disabled, compact }) {
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  function submit(event) {
    event.preventDefault();
    if (!draft.trim()) return;
    onAdd?.(draft);
    setDraft("");
    setEditing(false);
  }
  return (
    <div className={`tag-row${compact ? " tag-row--compact" : ""}`}>
      <ul className="tag-list" aria-label="Tags">
        {tags.map(tag => <li key={tag.id} className={`tag tag--${tag.tone}`}>{tag.label}</li>)}
        {custom.map(tag => (
          <li key={`custom-${tag}`} className="tag tag--custom">
            {tag}
            <button type="button" className="tag-remove" aria-label={`Remove tag ${tag}`} disabled={disabled}
              onClick={() => onRemove?.(tag)}><X size={10} /></button>
          </li>
        ))}
      </ul>
      {onAdd && (editing ? (
        <form className="tag-form" onSubmit={submit}>
          <input aria-label="New tag" autoFocus maxLength={18} placeholder="e.g. easy" value={draft}
            onChange={event => setDraft(event.target.value)}
            onKeyDown={event => { if (event.key === "Escape") { setEditing(false); setDraft(""); } }} />
          <button type="submit" className="text-button" disabled={!draft.trim()}>Add</button>
        </form>
      ) : (
        <button type="button" className="tag-add" disabled={disabled} onClick={() => setEditing(true)}
          title="Add your own tag"><Plus size={11} /> tag</button>
      ))}
    </div>
  );
}
