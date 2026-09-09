// Homepage category shelves rendered as a slider. Same technique as
// js/news-slider.js: the track holds the product list twice, each click steps
// exactly one card, and the moment the view crosses into the second copy it
// silently rewinds by one full set — so both directions loop forever with no
// visible edge.
//
// The second copy is cloned here rather than printed by the build: seven shelves
// would otherwise ship 140 product cards of markup instead of 70, and search
// engines would see every product on the page twice.
//
// Card width is computed rather than fixed in CSS so exactly N cards fill the
// viewport at every container width (no half-card peeking at the edge). The nav
// buttons are centred purely in CSS (top: 50% + translateY(-50%)), so nothing
// here has to measure them.
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".dh-home-shelf-slider").forEach(initShelfSlider);

  function initShelfSlider(slider) {
    const viewport = slider.querySelector(".dh-home-shelf-viewport");
    const track = slider.querySelector(".dh-home-shelf-track");
    const prevBtn = slider.querySelector(".dh-shelf-prev");
    const nextBtn = slider.querySelector(".dh-shelf-next");
    const originals = [...track.querySelectorAll(".dh-home-category-product")];
    const setSize = originals.length;
    // A single product can never loop — hide the controls rather than leaving
    // two dead buttons on the shelf.
    if (setSize < 2) {
      slider.classList.add("is-static");
      return;
    }

    // Clones are decoration: hidden from screen readers and skipped by the
    // keyboard, so the same product is never announced or tabbed to twice.
    const clones = originals.map((card) => {
      const clone = card.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      clone.querySelectorAll("a, button").forEach((el) => el.setAttribute("tabindex", "-1"));
      track.appendChild(clone);
      return clone;
    });
    const cards = [...originals, ...clones];

    const GAP = 10; // must match .dh-home-shelf-track's CSS gap
    let index = 0;

    // 5 / 4 / 2 / 1 cards per view, widest to narrowest.
    function visibleCount() {
      const w = window.innerWidth;
      if (w < 480) return 1;
      if (w < 768) return 2;
      if (w < 1024) return 4;
      return 5;
    }

    function layout() {
      const n = Math.min(visibleCount(), setSize);
      const cardWidth = (viewport.clientWidth - GAP * (n - 1)) / n;
      cards.forEach((c) => (c.style.width = `${cardWidth}px`));
      // Nothing to slide when the whole set already fits: hide the controls and
      // the clones, otherwise the duplicates would show up as extra products.
      const canSlide = setSize > n;
      slider.classList.toggle("is-static", !canSlide);
      clones.forEach((clone) => (clone.hidden = !canSlide));
      if (!canSlide) index = 0;
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

    nextBtn.addEventListener("click", () => {
      if (slider.classList.contains("is-static")) return;
      goTo(index + 1, true);
    });

    prevBtn.addEventListener("click", () => {
      if (slider.classList.contains("is-static")) return;
      if (index <= 0) {
        // Jump forward one set without animating, then step back — so going
        // "left" from the first card lands on the last one seamlessly.
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
  }
});
