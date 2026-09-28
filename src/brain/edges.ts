
import { Note } from './note'
export function edgesOf(note: Note) {
  return note.links.map(to => ({ from_id: note.id, to_id: to, relation: 'links' }))
}
