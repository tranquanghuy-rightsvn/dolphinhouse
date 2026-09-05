// Homepage "Tin tức" slider: prev/next buttons, loops forever. The track
// markup holds the post list duplicated once (see scripts/build.mjs); this
// steps one card per click and silently rewinds by exactly one set's width
// whenever it crosses into the duplicate, so both directions loop endlessly
// without ever hitting a visible edge. Card width is computed (not fixed in
// CSS) so exactly N cards always fill the viewport — no partial card peeking
// at the edge regardless of container width.
document.addEventListener("DOMContentLoaded", () => {
  const slider = document.querySelector(".dh-home-news-slider");
  if (!slider) return;
  const viewport = slider.querySelector(".dh-home-news-viewport");
  const track = slider.querySelector(".dh-home-news-track");
  const prevBtn = slider.querySelector(".dh-news-prev");
  const nextBtn = slider.querySelector(".dh-news-next");
  const cards = [...track.querySelectorAll(".dh-home-news-card")];
  const total = cards.length;
  const setSize = total / 2; // one full (non-duplicated) set of posts
  if (setSize < 1) return;

  const GAP = 20; // must match .dh-home-news-track's CSS gap
  let index = 0;

  function visibleCount() {
    const w = window.innerWidth;
    if (w < 640) return 1;
    if (w < 1024) return 2;
    return 4;
  }

  // Nav buttons sit 2/3 down the thumbnail (aspect-ratio 16/10), not the
  // whole card — low enough to clear the image, high enough to stay off
  // the title text below it.
  function positionNavButtons(cardWidth) {
    const imageHeight = cardWidth * (10 / 16);
    const top = `${(imageHeight * 2) / 3}px`;
    prevBtn.style.top = top;
    nextBtn.style.top = top;
  }

  function layout() {
    const n = visibleCount();
    const cardWidth = (viewport.clientWidth - GAP * (n - 1)) / n;
    cards.forEach((c) => (c.style.width = `${cardWidth}px`));
    positionNavButtons(cardWidth);
    goTo(index, false);
  }

  function cardStep() {
    return cards[0].getBoundingClientRect().width + GAP;
  }

  function goTo(i, animate) {
    track.style.transition = animate ? "transform 0.35s ease" : "none";
    track.style.transform = `translateX(-${i * cardStep()}px)`;
    index = i;
  }

  track.addEventListener("transitionend", () => {
    if (index >= setSize) goTo(index - setSize, false);
  });

  nextBtn.addEventListener("click", () => goTo(index + 1, true));

  prevBtn.addEventListener("click", () => {
    if (index <= 0) {
      const jumpTo = index + setSize;
      goTo(jumpTo, false);
      track.offsetHeight; // force reflow so the jump renders before animating
      goTo(jumpTo - 1, true);
    } else {
      goTo(index - 1, true);
    }
  });

  window.addEventListener("resize", layout);
  layout();
});
