// Kept for existing consumers; rooms now own the default audio lifecycle.
import { useGameAudio } from "../useGameAudio";
export function useAvalonAudio() { return useGameAudio('avalon'); }
