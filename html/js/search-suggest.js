// Header search suggestions: the visitor stops typing for a second and gets a
// short list of matching products underneath the box.
//
// Matching is a plain accent-insensitive substring over name + SKU + brand
// (window.DHText.normalize, shared with the shop listing's ?q= filter), so
// "noi com" and "cơm điện" both find "Nồi Cơm Điện Cuckoo" — a prefix-only
// match would find neither.
//
// The product list is fetched once from /search-index.json on the first search
// instead of being embedded in every page, and the fetch itself is what the
// debounce protects: no request while the visitor is still typing.
(function () {
  var DEBOUNCE_MS = 1000; // "nghỉ 1s thì gợi ý"
  var MIN_CHARS = 2;
  var MAX_RESULTS = 8;

  // Looked up per call, not captured at load time: capturing it would bake in
  // the fallback whenever this file happens to run before js/site.js (script
  // order, or a stale cached copy of it) and searching would quietly become
  // accent-sensitive.
  function normalize(value) {
    var shared = window.DHText && window.DHText.normalize;
    return shared ? shared(value) : String(value == null ? "" : value).toLowerCase().trim();
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function formatVnd(value) {
    var n = Number(String(value || "0").replace(/[^0-9]/g, "")) || 0;
    return n.toLocaleString("vi-VN") + " ₫";
  }

  var indexPromise = null;
  function loadIndex() {
    if (!indexPromise) {
      indexPromise = fetch("/search-index.json")
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.json();
        })
        .then(function (products) {
          // Normalise once per session, not once per keystroke.
          return products.map(function (p) {
            return { p: p, haystack: normalize([p.name, p.sku, (p.brands || []).join(" ")].join(" ")) };
          });
        })
        .catch(function (err) {
          console.warn("Không tải được danh sách sản phẩm để gợi ý", err);
          indexPromise = null; // let the next attempt retry
          throw err;
        });
    }
    return indexPromise;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.querySelector(".search-form");
    var input = form && form.querySelector('input[type="search"], input[name="q"]');
    if (!form || !input) return;

    var panel = document.createElement("div");
    panel.className = "search-suggest";
    panel.hidden = true;
    panel.setAttribute("role", "listbox");
    form.appendChild(panel);

    var timer = null;
    var activeIndex = -1;
    var lastQuery = "";

    function close() {
      panel.hidden = true;
      panel.innerHTML = "";
      activeIndex = -1;
    }

    function open(html) {
      panel.innerHTML = html;
      panel.hidden = false;
      activeIndex = -1;
    }

    function items() {
      return [].slice.call(panel.querySelectorAll(".search-suggest-item"));
    }

    function highlight(next) {
      var list = items();
      if (!list.length) return;
      if (activeIndex >= 0 && list[activeIndex]) list[activeIndex].classList.remove("is-active");
      activeIndex = (next + list.length) % list.length;
      list[activeIndex].classList.add("is-active");
      list[activeIndex].scrollIntoView({ block: "nearest" });
    }

    function resultsHtml(matches, total, query) {
      var rows = matches
        .map(function (p) {
          var price = p.on_sale && p.regular_price !== p.price
            ? '<span class="search-suggest-old">' + formatVnd(p.regular_price) + "</span> " + formatVnd(p.price)
            : formatVnd(p.price);
          return (
            '<a class="search-suggest-item" role="option" href="/san-pham/' + esc(p.slug) + '/">' +
            (p.img ? '<img src="' + esc(p.img) + '" alt="" loading="lazy">' : '<span class="search-suggest-noimg"></span>') +
            '<span class="search-suggest-text">' +
            '<span class="search-suggest-name">' + esc(p.name) + "</span>" +
            '<span class="search-suggest-price">' + price + "</span>" +
            "</span></a>"
          );
        })
        .join("");
      var more = total > matches.length
        ? '<a class="search-suggest-more" href="/cua-hang/?q=' + encodeURIComponent(query) + '">Xem tất cả ' + total + " kết quả →</a>"
        : "";
      return rows + more;
    }

    function search(query) {
      lastQuery = query;
      loadIndex()
        .then(function (index) {
          if (query !== lastQuery) return; // a newer query already ran
          var q = normalize(query);
          var matches = [];
          for (var i = 0; i < index.length; i++) {
            if (index[i].haystack.indexOf(q) !== -1) matches.push(index[i].p);
          }
          if (!matches.length) {
            open('<div class="search-suggest-empty">Không tìm thấy sản phẩm nào cho “' + esc(query) + "”.</div>");
            return;
          }
          open(resultsHtml(matches.slice(0, MAX_RESULTS), matches.length, query));
        })
        .catch(function () {
          close(); // suggestions are a bonus; submitting the form still works
        });
    }

    input.addEventListener("input", function () {
      var query = input.value.trim();
      clearTimeout(timer);
      if (query.length < MIN_CHARS) {
        close();
        return;
      }
      timer = setTimeout(function () {
        search(query);
      }, DEBOUNCE_MS);
    });

    input.addEventListener("keydown", function (e) {
      if (panel.hidden) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        highlight(activeIndex + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        highlight(activeIndex - 1);
      } else if (e.key === "Enter") {
        var list = items();
        if (activeIndex >= 0 && list[activeIndex]) {
          e.preventDefault(); // open the highlighted product instead of submitting
          window.location.href = list[activeIndex].getAttribute("href");
        }
      } else if (e.key === "Escape") {
        close();
      }
    });

    // Re-opening on focus avoids a second wait for someone who clicked away and
    // came back to the same query.
    input.addEventListener("focus", function () {
      if (panel.innerHTML && input.value.trim().length >= MIN_CHARS) panel.hidden = false;
    });

    document.addEventListener("click", function (e) {
      if (!form.contains(e.target)) close();
    });

    form.addEventListener("submit", close);
  });
})();
