import { useEffect, useRef } from 'react';
import lottie, { type AnimationItem } from 'lottie-web/build/player/lottie_light';
import compressedClips from 'virtual:agent-pals';

/** Распаковка локальных клипов без сети и дополнительной библиотеки. */
async function unpack(encoded: string | null): Promise<unknown> {
  if (encoded === null) return null;
  const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(stream).text()) as unknown;
}

/** Настоящие клипы Cat из Agent Pulse, без функций и состояния агента. */
export function Mascot(): JSX.Element | null {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = container.current;
    if (element === null || compressedClips[0] === null) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let disposed = false;
    let clip = 0;
    let loops = 0;
    let animation: AnimationItem | undefined;

    function syncPlayback(): void {
      if (motion.matches) animation?.goToAndStop(0, true);
      else if (document.hidden) animation?.pause();
      else animation?.play();
    }

    void Promise.all(compressedClips.map(unpack))
      .then((clips) => {
        if (disposed) return;
        function show(): void {
          if (element === null || disposed) return;
          animation?.destroy();
          animation = lottie.loadAnimation({
            container: element,
            renderer: 'svg',
            loop: true,
            autoplay: false,
            animationData: structuredClone(clips[clip]),
          });
          animation.addEventListener('loopComplete', () => {
            loops += 1;
            // Три спокойных петли, затем один взгляд вверх из Thinking.
            if (clips[1] === null || loops < (clip === 0 ? 3 : 1)) return;
            loops = 0;
            clip = clip === 0 ? 1 : 0;
            show();
          });
          syncPlayback();
        }
        show();
      })
      .catch(() => {
        // Декоративный элемент не должен мешать работе самого плагина.
        if (!disposed) element.hidden = true;
      });

    motion.addEventListener('change', syncPlayback);
    document.addEventListener('visibilitychange', syncPlayback);
    return () => {
      disposed = true;
      motion.removeEventListener('change', syncPlayback);
      document.removeEventListener('visibilitychange', syncPlayback);
      animation?.destroy();
    };
  }, []);

  if (compressedClips[0] === null) return null;
  return <div ref={container} className="pulse-mascot" aria-hidden="true" />;
}
