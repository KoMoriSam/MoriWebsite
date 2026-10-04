import { computed, reactive, toValue } from 'vue';
import { artCandidates } from '@/games/fogport/art-assets';

const failed = reactive(new Set());
export const artSource = name => artCandidates(name).find(url => !failed.has(url)) || '';
export function useArtAsset(name) {
  const src = computed(() => artSource(toValue(name)));
  function onError(event) {
    // Read the URL from this element: an old request may fail after its asset changed.
    const url = event.target.getAttribute('src') || event.target.getAttribute('href');
    if (url) failed.add(url);
  }
  return { src, onError };
}
