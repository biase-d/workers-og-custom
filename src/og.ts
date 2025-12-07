import satori, { init } from "satori/wasm";
import initYoga from "yoga-wasm-web";
import { Resvg, initWasm } from "@resvg/resvg-wasm";
import { parseHtml } from "./parseHtml";
import { loadGoogleFont } from "./font";
import type { ImageResponseOptions } from "./types";
import { loadDynamicAsset } from "./emoji";

// @ts-expect-error .wasm files are not typed
import yogaWasm from "../vendors/yoga.wasm";
// @ts-expect-error .wasm files are not typed
import resvgWasm from "../vendors/resvg.wasm";

// Helper: Decode Base64 to Uint8Array (Browser/Worker compatible)
const decodeWasm = (base64String: string) => {
  const binaryString = atob(base64String);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const initResvgWasm = async () => {
  try {
    // Decode the Base64 string to a buffer
    await initWasm(decodeWasm(resvgWasm));
  } catch (err) {
    // Ignore if already initialized
    if (err instanceof Error && err.message.includes("Already initialized")) {
      return;
    }
    throw err;
  }
};

const initYogaWasm = async () => {
  try {
    // Decode the Base64 string to a buffer
    const yoga = await initYoga(decodeWasm(yogaWasm));
    init(yoga);
  } catch (err) {
    throw err;
  }
};

interface Props {
  element: string | React.ReactNode;
  options: ImageResponseOptions;
}

export const og = async ({ element, options }: Props) => {
  await Promise.all([initResvgWasm(), initYogaWasm()]);

  const reactElement =
    typeof element === "string" ? await parseHtml(element) : element;

  const width = options.width;
  const height = options.height;

  let widthHeight:
    | { width: number; height: number }
    | { width: number }
    | { height: number } = {
    width: 1200,
    height: 630,
  };

  if (width && height) {
    widthHeight = { width, height };
  } else if (width) {
    widthHeight = { width };
  } else if (height) {
    widthHeight = { height };
  }

  const svg = await satori(reactElement, {
    ...widthHeight,
    fonts: !!options?.fonts?.length
      ? options.fonts
      : [
          {
            name: "Bitter",
            data: await loadGoogleFont({ family: "Bitter", weight: 600 }),
            weight: 500,
            style: "normal",
          },
        ],
    loadAdditionalAsset: options.emoji
      ? loadDynamicAsset({
          emoji: options.emoji,
        })
      : undefined,
  });

  const format = options?.format || "png";

  if (format === "svg") {
    return svg;
  }

  const resvg = new Resvg(svg, {
    fitTo:
      "width" in widthHeight
        ? {
            mode: "width" as const,
            value: widthHeight.width,
          }
        : {
            mode: "height" as const,
            value: widthHeight.height,
          },
  });

  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  return pngBuffer;
};

export class ImageResponse extends Response {
    constructor(
    element: string | React.ReactNode,
    options: ImageResponseOptions,
  ) {
    super();

    if (options.format === "svg") {
      return (async () => {
        const svg = await og({ element, options });
        return new Response(svg, {
          headers: {
            "Content-Type": "image/svg+xml",
            "Cache-Control": options.debug
              ? "no-cache, no-store"
              : "public, immutable, no-transform, max-age=31536000",
            ...options.headers,
          },
          status: options.status || 200,
          statusText: options.statusText,
        });
      })() as unknown as ImageResponse;
    } else {
      const body = new ReadableStream({
        async start(controller) {
          const buffer = await og({
            element,
            options,
          });

          controller.enqueue(buffer);
          controller.close();
        },
      });

      return new Response(body, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": options.debug
            ? "no-cache, no-store"
            : "public, immutable, no-transform, max-age=31536000",
          ...options.headers,
        },
        status: options.status || 200,
        statusText: options.statusText,
      });
    }
  }
}
