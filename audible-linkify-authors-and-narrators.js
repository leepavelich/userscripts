// ==UserScript==
// @name         Audible: Linkify Authors & Narrators
// @namespace    https://github.com/leepavelich
// @version      2.1
// @description  Make author/narrator names clickable Audible searches on the checkout success page
// @match        https://www.audible.com/typ*
// @run-at       document-end
// @grant        none
// ==/UserScript==
(() => {
  "use strict";

  const CONFIG = {
    selectors: {
      author: 'adbl-metadata[slot="author"]',
      performer: 'adbl-metadata[slot="performer"]',
    },
    patterns: {
      author: /^\s*(By:|Written by:)\s*/i,
      performer: /^\s*(Narrated by:)\s*/i,
      nameSplit: /\s*,\s*|\s+&\s+|\s+and\s+/i,
    },
    retryDelay: 120,
    maxObserveTime: 3000
  };

  const createSearchLink = (name) => {
    const a = document.createElement("a");
    a.href = `/search?keywords=${encodeURIComponent(name.trim())}`;
    a.textContent = name.trim();
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    return a;
  };

  const parseNames = (text, prefixPattern) => {
    const match = text.match(prefixPattern);
    const prefix = match?.[0] || "";
    const names = text
      .replace(prefixPattern, "")
      .split(CONFIG.patterns.nameSplit)
      .map(s => s.trim())
      .filter(Boolean);
    return { prefix, names };
  };

  const createLinkedElement = (originalEl, prefix, names) => {
    const newEl = document.createElement("span");
    ["slot", "class", "style"].forEach(attr => {
      const value = originalEl.getAttribute(attr);
      if (value) newEl.setAttribute(attr, value);
    });

    if (prefix) newEl.append(prefix);
    names.forEach((name, i) => {
      newEl.append(createSearchLink(name));
      if (i < names.length - 1) newEl.append(", ");
    });

    return newEl;
  };

  const processElement = (selector, prefixPattern) => {
    const el = document.querySelector(selector);
    if (!el?.textContent?.trim()) return false;

    const { prefix, names } = parseNames(el.textContent.trim(), prefixPattern);
    if (!names.length) return false;

    const newEl = createLinkedElement(el, prefix, names);

    el.replaceChildren(...newEl.childNodes.values());

    setTimeout(() => {
      const currentEl = document.querySelector(selector);
      if (currentEl && !currentEl.querySelector("a")) {
        currentEl.replaceWith(newEl);
      }
    }, CONFIG.retryDelay);

    return true;
  };

  const areLinksPresent = () =>
    Object.values(CONFIG.selectors).every(sel =>
      document.querySelector(`${sel} a`)
    );

  const run = () => {
    if (areLinksPresent()) return;

    processElement(CONFIG.selectors.author, CONFIG.patterns.author);
    processElement(CONFIG.selectors.performer, CONFIG.patterns.performer);
  };

  run();

  const observer = new MutationObserver(() => {
    if (areLinksPresent()) {
      observer.disconnect();
      return;
    }
    run();
  });

  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true
  });

  setTimeout(() => observer.disconnect(), CONFIG.maxObserveTime);
})();
