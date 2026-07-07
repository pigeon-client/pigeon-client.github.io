import { type RefObject, useEffect } from "react";

const URL_PRE = "https://jsonplaceholder.typicode.com";
const URL_PATH = "/todos/1";

/**
 * Drives the looping hero demo: press "+", type the URL (tab name follows the
 * path), fire Send, stream the JSON response, then auto-file a new domain
 * folder in the sidebar. Ported from the static site's vanilla script; starts
 * when the app scrolls into view and honors prefers-reduced-motion.
 */
export function useHeroDemo(appRef: RefObject<HTMLElement>) {
  useEffect(() => {
    const app = appRef.current;
    if (!app) return;

    const $ = (id: string) => app.querySelector<HTMLElement>(`#${id}`);
    const urlEl = $("demo-url");
    const sendEl = $("demo-send");
    const spinEl = $("demo-spin");
    const statusEl = $("demo-status");
    const timeEl = $("demo-time");
    const sizeEl = $("demo-size");
    const lines = Array.from(app.querySelectorAll<HTMLElement>("#demo-json .ln"));
    const folderEl = $("demo-folder");
    const cntEl = $("demo-cnt");
    const reqsEl = $("demo-reqs");
    const tabEl = $("demo-tab");
    const tabNameEl = $("demo-tabname");
    const plusEl = $("demo-plus");

    if (
      !(
        urlEl &&
        sendEl &&
        spinEl &&
        statusEl &&
        timeEl &&
        sizeEl &&
        folderEl &&
        cntEl &&
        reqsEl &&
        tabEl &&
        tabNameEl &&
        plusEl
      )
    ) {
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers: number[] = [];
    const intervals: number[] = [];
    const after = (ms: number, fn: () => void) => {
      timers.push(window.setTimeout(fn, ms));
    };

    const setUrl = (preLen: number, pathLen: number, caret: boolean) => {
      urlEl.innerHTML =
        URL_PRE.slice(0, preLen) +
        (pathLen > 0 ? `<span class="path">${URL_PATH.slice(0, pathLen)}</span>` : "") +
        (caret ? '<span class="caret"></span>' : "");
    };

    const showFinal = () => {
      setUrl(URL_PRE.length, URL_PATH.length, false);
      statusEl.style.display = "";
      timeEl.style.display = "";
      sizeEl.style.display = "";
      for (const l of lines) l.classList.add("show");
      folderEl.classList.add("show");
      reqsEl.textContent = "38";
      tabEl.classList.add("show");
      tabNameEl.textContent = URL_PATH;
    };

    if (reduced) {
      showFinal();
      return;
    }

    const resetDemo = () => {
      statusEl.style.display = "none";
      timeEl.style.display = "none";
      sizeEl.style.display = "none";
      for (const l of lines) l.classList.remove("show");
      folderEl.classList.remove("show", "flash");
      cntEl.classList.remove("pop");
      reqsEl.textContent = "37";
      tabEl.classList.remove("show");
      tabNameEl.classList.remove("renamed");
      tabNameEl.textContent = "Untitled Request";
      setUrl(0, 0, true);
    };

    const openTab = (done: () => void) => {
      plusEl.classList.add("press");
      after(240, () => tabEl.classList.add("show"));
      after(950, () => {
        plusEl.classList.remove("press");
        done();
      });
    };

    const typeUrl = (done: () => void) => {
      const total = URL_PRE.length + URL_PATH.length;
      let i = 0;
      const t = window.setInterval(() => {
        i++;
        const preLen = Math.min(i, URL_PRE.length);
        const pathLen = Math.max(0, i - URL_PRE.length);
        setUrl(preLen, pathLen, true);
        if (pathLen > 0) {
          tabNameEl.textContent = URL_PATH.slice(0, pathLen);
          if (pathLen === 1) tabNameEl.classList.add("renamed");
        }
        if (i >= total) {
          window.clearInterval(t);
          setUrl(URL_PRE.length, URL_PATH.length, false);
          done();
        }
      }, 28);
      intervals.push(t);
    };

    const fireSend = (done: () => void) => {
      sendEl.classList.add("firing");
      spinEl.classList.add("on");
      after(750, () => {
        sendEl.classList.remove("firing");
        spinEl.classList.remove("on");
        done();
      });
    };

    const showResponse = (done: () => void) => {
      statusEl.style.display = "";
      timeEl.style.display = "";
      sizeEl.style.display = "";
      lines.forEach((l, i) => {
        after(90 * i, () => l.classList.add("show"));
      });
      after(90 * lines.length + 650, done);
    };

    const createFolder = (done: () => void) => {
      folderEl.classList.add("show");
      after(480, () => {
        folderEl.classList.add("flash");
        cntEl.classList.add("pop");
        reqsEl.textContent = "38";
      });
      after(4300, done);
    };

    const loop = () => {
      resetDemo();
      after(700, () => {
        openTab(() => {
          typeUrl(() => {
            after(350, () => {
              fireSend(() => {
                showResponse(() => createFolder(loop));
              });
            });
          });
        });
      });
    };

    let started = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started) {
          started = true;
          loop();
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(app);

    return () => {
      io.disconnect();
      for (const t of timers) window.clearTimeout(t);
      for (const i of intervals) window.clearInterval(i);
    };
  }, [appRef]);
}
