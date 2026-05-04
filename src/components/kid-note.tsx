import { Pill } from "@/components/ui/pill"

export interface KidNoteProps {
  note: { who: string | null; text: string }
}

export function KidNote({ note }: KidNoteProps) {
  return (
    <div className="bg-amber-soft text-amber-ink rounded-sm px-3 py-2 flex items-center gap-2 text-body-sm">
      {note.who && (
        <Pill variant="amber" size="sm">
          {note.who}
        </Pill>
      )}
      <span>{note.text}</span>
    </div>
  )
}
