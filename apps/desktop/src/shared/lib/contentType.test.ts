import { describe, expect, it } from "vitest";
import {
  bodyTypeFromContentType,
  classifyResponse,
  contentTypeForBody,
  highlightLanguageFor,
  isBinaryBodyType,
  isTextualBodyType,
  normalizeMime,
} from "./contentType";

describe("normalizeMime", () => {
  it("strips parameters", () => {
    expect(normalizeMime("application/json; charset=utf-8")).toBe("application/json");
  });
});

describe("classifyResponse", () => {
  it("classifies catalog types", () => {
    expect(classifyResponse("application/json")).toBe("json");
    expect(classifyResponse("application/problem+json")).toBe("json");
    expect(classifyResponse("application/x-ndjson")).toBe("ndjson");
    expect(classifyResponse("application/yaml")).toBe("yaml");
    expect(classifyResponse("text/csv")).toBe("csv");
    expect(classifyResponse("text/html")).toBe("html");
    expect(classifyResponse("application/xml")).toBe("xml");
    expect(classifyResponse("text/event-stream")).toBe("sse");
    expect(classifyResponse("application/pdf")).toBe("pdf");
    expect(classifyResponse("application/zip")).toBe("zip");
    expect(classifyResponse("application/protobuf")).toBe("protobuf");
    expect(classifyResponse("application/msgpack")).toBe("msgpack");
    expect(classifyResponse("image/webp")).toBe("image");
    expect(classifyResponse("image/svg+xml")).toBe("svg");
    expect(classifyResponse("video/mp4")).toBe("video");
    expect(classifyResponse("audio/mpeg")).toBe("audio");
  });

  it("handles suffix / heuristic types", () => {
    expect(classifyResponse("application/vnd.api+json")).toBe("json");
    expect(classifyResponse("application/atom+xml")).toBe("xml");
    expect(classifyResponse("application/ndjson")).toBe("ndjson");
  });

  it("uses Content-Type as the authoritative render signal", () => {
    expect(classifyResponse("text/plain; charset=utf-8")).toBe("text");
    expect(classifyResponse("image/png; name=response.bin")).toBe("image");
    expect(classifyResponse("application/vnd.example.binary")).toBe("binary");
    expect(classifyResponse("model/gltf-binary")).toBe("binary");
  });
});

describe("body type helpers", () => {
  it("marks text vs binary", () => {
    expect(isTextualBodyType("application/json")).toBe(true);
    expect(isTextualBodyType("text/csv")).toBe(true);
    expect(isTextualBodyType("application/graphql")).toBe(true);
    expect(isBinaryBodyType("application/octet-stream")).toBe(true);
    expect(isBinaryBodyType("application/pdf")).toBe(true);
    expect(isBinaryBodyType("image/png")).toBe(true);
    expect(isBinaryBodyType("application/json")).toBe(false);
  });

  it("contentTypeForBody mirrors curl CT", () => {
    expect(contentTypeForBody("application/json")).toBe("application/json");
    expect(contentTypeForBody("multipart/form-data")).toBeNull();
    expect(contentTypeForBody("none")).toBeNull();
  });

  it("infers body type from import CT", () => {
    expect(bodyTypeFromContentType("application/json; charset=utf-8")).toBe("application/json");
    expect(bodyTypeFromContentType("text/csv")).toBe("text/csv");
    expect(bodyTypeFromContentType("application/pdf")).toBe("application/pdf");
  });

  it("picks highlight languages", () => {
    expect(highlightLanguageFor("application/json")).toBe("json");
    expect(highlightLanguageFor("text/html")).toBe("html");
    expect(highlightLanguageFor("application/yaml")).toBe("yaml");
  });
});
