import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";

import {
  orchestratePolicyDecision,
  type OrchestrationInput,
} from "../src/engine/orchestrator";

const PORT = 3000;
const MAX_BODY_BYTES = 1_000_000;

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isHexValue(value: unknown): value is `0x${string}` {
  return (
    typeof value === "string" &&
    value.startsWith("0x") &&
    value.length > 2
  );
}

function isOrchestrationInput(
  value: unknown
): value is OrchestrationInput {
  if (!isObject(value)) {
    return false;
  }

  if (
    !isObject(value.policy) ||
    !isObject(value.data) ||
    !isObject(value.evidence) ||
    !Array.isArray(value.requiredEvidenceSources)
  ) {
    return false;
  }

  if (
    !isHexValue(value.transactionHash) ||
    typeof value.evaluatedAt !== "number"
  ) {
    return false;
  }

  if (!isHexValue(value.evidence.transactionHash)) {
    return false;
  }

  return true;
}

function sendJson(
  response: ServerResponse,
  statusCode: number,
  body: unknown
): void {
  const payload = JSON.stringify(body);

  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
  });

  response.end(payload);
}

async function readJsonBody(
  request: IncomingMessage
): Promise<unknown> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk)
      ? chunk
      : Buffer.from(chunk);

    totalBytes += buffer.length;

    if (totalBytes > MAX_BODY_BYTES) {
      throw new Error("REQUEST_TOO_LARGE");
    }

    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    throw new Error("EMPTY_BODY");
  }

  return JSON.parse(
    Buffer.concat(chunks).toString("utf8")
  ) as unknown;
}

const server = createServer(
  async (
    request: IncomingMessage,
    response: ServerResponse
  ): Promise<void> => {
    if (
      request.method === "GET" &&
      request.url === "/health"
    ) {
      sendJson(response, 200, {
        status: "ok",
        service: "gletta-integration-api",
      });

      return;
    }

    if (
      request.method !== "POST" ||
      request.url !== "/v1/orchestrate"
    ) {
      sendJson(response, 404, {
        error: "NOT_FOUND",
      });

      return;
    }

    try {
      const body = await readJsonBody(request);

      if (!isOrchestrationInput(body)) {
        sendJson(response, 400, {
          error: "INVALID_REQUEST",
        });

        return;
      }

      if (
        body.transactionHash !==
        body.evidence.transactionHash
      ) {
        sendJson(response, 400, {
          error: "TRANSACTION_HASH_MISMATCH",
        });

        return;
      }

      const result = orchestratePolicyDecision(body);

      sendJson(response, 200, {
        transactionHash: body.transactionHash,
        policyReference: body.policy.reference,
        result,
      });
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message === "REQUEST_TOO_LARGE"
      ) {
        sendJson(response, 413, {
          error: "REQUEST_TOO_LARGE",
        });

        return;
      }

      if (
        error instanceof SyntaxError ||
        (
          error instanceof Error &&
          error.message === "EMPTY_BODY"
        )
      ) {
        sendJson(response, 400, {
          error: "INVALID_JSON",
        });

        return;
      }

      sendJson(response, 500, {
        error: "INTERNAL_SERVER_ERROR",
      });
    }
  }
);

server.listen(PORT, "127.0.0.1", () => {
  console.log(
    `Gletta Integration API listening on http://127.0.0.1:${PORT}`
  );
});