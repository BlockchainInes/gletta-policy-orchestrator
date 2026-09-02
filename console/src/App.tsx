import { useState } from "react";
import "./App.css";

type DecisionStatus = "approve" | "deny" | "review";

interface ApiResult {
  transactionHash: string;
  policyReference: {
    id: string;
    hash: string;
    version: number;
  };
  result: {
    status: DecisionStatus;
    evidenceValid: boolean;
    decision?: {
      status: DecisionStatus;
      transactionHash: string;
      evidenceHash: string;
      evaluatedAt: number;
    };
    expiredEvidenceIds: string[];
    missingEvidenceSources: string[];
  };
}

const requestBody = {
  policy: {
    reference: {
      id: "0x8c58c8e4f125b33e8f7d4db88c9a61dc385dbfa519134e62d84f973c8538e2c1",
      hash: "0x22bb427620f67f9d707c9e5739b0a2ac4f8fb49e97d7110aac7dbead2d5c9b76",
      version: 1,
    },
    name: "Institutional Settlement Policy",
    jurisdiction: "EU",
    description: "Controls institutional settlement eligibility.",
    active: true,
    rules: [
      {
        id: "counterparty-approved",
        field: "counterparty.status",
        operator: "eq",
        value: "approved",
        reason: "Counterparty is not approved",
      },
      {
        id: "sanctions-clear",
        field: "screening.sanctions",
        operator: "eq",
        value: false,
        reason: "Sanctions screening failed",
      },
      {
        id: "risk-threshold",
        field: "screening.riskScore",
        operator: "lte",
        value: 25,
        reason: "Risk score exceeds settlement threshold",
      },
    ],
  },
  data: {
    counterparty: {
      status: "approved",
    },
    screening: {
      sanctions: false,
      riskScore: 18,
    },
  },
  evidence: {
    transactionHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    records: [
      {
        id: "ev-kyc",
        source: "kyc",
        subject: "institutional-counterparty-001",
        collectedAt: 1787954100,
        expiresAt: 1787958000,
        attributes: {},
        hash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      },
      {
        id: "ev-aml",
        source: "aml",
        subject: "institutional-counterparty-001",
        collectedAt: 1787954100,
        expiresAt: 1787958000,
        attributes: {},
        hash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      },
      {
        id: "ev-sanctions",
        source: "sanctions",
        subject: "institutional-counterparty-001",
        collectedAt: 1787954100,
        expiresAt: 1787958000,
        attributes: {},
        hash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      },
      {
        id: "ev-wallet",
        source: "wallet-screening",
        subject: "institutional-counterparty-001",
        collectedAt: 1787954100,
        expiresAt: 1787958000,
        attributes: {},
        hash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      },
    ],
    assembledAt: 1787954340,
  },
  requiredEvidenceSources: [
    "kyc",
    "aml",
    "sanctions",
    "wallet-screening",
  ],
  transactionHash:
    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  evaluatedAt: 1787954400,
};

function App() {
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runAuthorization() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/v1/orchestrate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = (await response.json()) as ApiResult;
      setResult(data);
    } catch (requestError) {
      setResult(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Authorization request failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">GLETTA POLICY ORCHESTRATOR</p>
          <h1>Digital Asset Authorization Console</h1>
          <p className="subtitle">
            Reference integration for policy-controlled institutional
            settlement workflows.
          </p>
        </div>

        <div className="network-badge">
          <span className="network-dot" />
          Integration API
        </div>
      </section>

      <section className="grid">
        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="label">TRANSACTION</p>
              <h2>Institutional Settlement</h2>
            </div>
            <span className="jurisdiction">EU</span>
          </div>

          <dl className="details">
            <div>
              <dt>Counterparty</dt>
              <dd>institutional-counterparty-001</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>approved</dd>
            </div>
            <div>
              <dt>Risk Score</dt>
              <dd>18 / 25</dd>
            </div>
            <div>
              <dt>Sanctions</dt>
              <dd>clear</dd>
            </div>
          </dl>

          <div className="evidence-row">
            <span>KYC</span>
            <span>AML</span>
            <span>Sanctions</span>
            <span>Wallet Screening</span>
          </div>

          <button
            className="run-button"
            type="button"
            onClick={runAuthorization}
            disabled={loading}
          >
            {loading ? "Evaluating..." : "Run Authorization"}
          </button>

          {error && <p className="error-message">{error}</p>}
        </article>

        <article className="panel">
          <p className="label">POLICY</p>
          <h2>Institutional Settlement Policy</h2>

          <dl className="details">
            <div>
              <dt>Version</dt>
              <dd>1</dd>
            </div>
            <div>
              <dt>Jurisdiction</dt>
              <dd>EU</dd>
            </div>
            <div>
              <dt>Required Evidence</dt>
              <dd>4 sources</dd>
            </div>
            <div>
              <dt>Policy State</dt>
              <dd>active</dd>
            </div>
          </dl>

          <div className="hash-block">
            <span>Policy ID</span>
            <code>
              0x8c58c8e4f125b33e8f7d4db88c9a61dc385dbfa519134e62d84f973c8538e2c1
            </code>
          </div>
        </article>
      </section>

      <section className="result-panel">
        <div className="result-heading">
          <div>
            <p className="label">AUTHORIZATION DECISION</p>
            <h2>
              {result
                ? result.result.status.toUpperCase()
                : "Awaiting Evaluation"}
            </h2>
          </div>

          {result && (
            <span
              className={`decision-badge ${result.result.status}`}
            >
              {result.result.status}
            </span>
          )}
        </div>

        {result ? (
          <div className="result-grid">
            <div>
              <span>Evidence Valid</span>
              <strong>
                {result.result.evidenceValid ? "Yes" : "No"}
              </strong>
            </div>

            <div>
              <span>Policy Version</span>
              <strong>{result.policyReference.version}</strong>
            </div>

            <div>
              <span>Evidence Hash</span>
              <code>
                {result.result.decision?.evidenceHash ?? "Not generated"}
              </code>
            </div>

            <div>
              <span>Transaction Hash</span>
              <code>{result.transactionHash}</code>
            </div>
          </div>
        ) : (
          <p className="empty-state">
            Submit the reference transaction to evaluate evidence and
            policy controls.
          </p>
        )}
      </section>
    </main>
  );
}

export default App;