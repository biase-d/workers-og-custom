// From @vercel/og
// https://www.npmjs.com/package/@vercel/og

type EmojiType =
  | "twemoji"
  | "openmoji"
  | "blobmoji"
  | "noto"
  | "fluent"
  | "fluentFlat";

const assetCache = new Map();

const U200D = String.fromCharCode(8205);
const UFE0Fg = /\uFE0F/g;

function getIconCode(char: string) {
  return toCodePoint(char.indexOf(U200D) < 0 ? char.replace(UFE0Fg, "") : char);
}

function toCodePoint(unicodeSurrogates: string) {
  var r = [],
    c2 = 0,
    p = 0,
    i = 0;
  while (i < unicodeSurrogates.length) {
    c2 = unicodeSurrogates.charCodeAt(i++);
    if (p) {
      r.push((65536 + ((p - 55296) << 10) + (c2 - 56320)).toString(16));
      p = 0;
    } else if (55296 <= c2 && c2 <= 56319) {
      p = c2;
    } else {
      r.push(c2.toString(16));
    }
  }
  return r.join("-");
}

const apis: Record<EmojiType, string | ((code: string) => string)> = {
  twemoji: (code: string) =>
    "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/" +
    code.toLowerCase() +
    ".svg",
  openmoji: "https://cdn.jsdelivr.net/npm/@svgmoji/openmoji@2.0.0/svg/",
  blobmoji: "https://cdn.jsdelivr.net/npm/@svgmoji/blob@2.0.0/svg/",
  noto: "https://cdn.jsdelivr.net/gh/svgmoji/svgmoji/packages/svgmoji__noto/svg/",
  fluent: (code: string) =>
    "https://cdn.jsdelivr.net/gh/shuding/fluentui-emoji-unicode/assets/" +
    code.toLowerCase() +
    "_color.svg",
  fluentFlat: (code: string) =>
    "https://cdn.jsdelivr.net/gh/shuding/fluentui-emoji-unicode/assets/" +
    code.toLowerCase() +
    "_flat.svg",
};

function loadEmoji(code: string, type: EmojiType) {
  if (!type || !apis[type]) {
    type = "twemoji";
  }
  const api = apis[type];
  if (typeof api === "function") {
    return fetch(api(code));
  }
  return fetch(`${api}${code.toUpperCase()}.svg`);
}

export const loadDynamicAsset = ({ emoji }: { emoji: EmojiType }) => {
  const fn = async (code: string, text: string) => {
    if (code === "emoji") {
      return (
        `data:image/svg+xml;base64,` +
        btoa(await (await loadEmoji(getIconCode(text), emoji)).text())
      );
    }
  };

  return async (...args: Parameters<typeof fn>) => {
    const key = JSON.stringify(args);
    const cache = assetCache.get(key);
    if (cache) return cache;
    const asset = await fn(...args);
    assetCache.set(key, asset);
    return asset;
  };
};
