---
layout: default
title: JWT Reader
hero_subtitle: Decode JSON Web Tokens right in the browser. Signatures are not validated, but the header and payload are decoded for quick inspection.
---

<section class="card" aria-labelledby="jwt-reader-title">
  <div class="breadcrumb"><a href="/">← Back to tool index</a></div>
  <div class="tool-header">
    <h2 id="jwt-reader-title">Decode a token</h2>
    <span class="status" id="jwt-status">Paste a token to decode the header and payload.</span>
  </div>
  <label for="jwt-input">JWT Token</label>
  <textarea id="jwt-input" placeholder="eyJhbGciOi..." spellcheck="false"></textarea>
  <p class="helper">
    Need a sample? <button class="link-button" type="button" id="jwt-example-button">Load example token</button>
  </p>
  <div class="tool-grid">
    <div>
      <h3>Header</h3>
      <div class="output" id="jwt-header"></div>
    </div>
    <div>
      <h3>Payload</h3>
      <div class="output" id="jwt-payload"></div>
    </div>
  </div>
</section>

<section class="card" aria-labelledby="jwt-notes">
  <h2 id="jwt-notes">Notes</h2>
  <ul>
    <li>Decoding happens entirely in your browser.</li>
    <li>Signatures are not verified here—use your auth stack for validation.</li>
    <li>Tokens must have three sections separated by periods.</li>
    <li>Use the example token button above to see a sample header and payload.</li>
  </ul>
</section>

<footer>
  Built for quick diagnostics.
</footer>

<script>
  const jwtInput = document.getElementById("jwt-input");
  const jwtHeader = document.getElementById("jwt-header");
  const jwtPayload = document.getElementById("jwt-payload");
  const jwtStatus = document.getElementById("jwt-status");
  const jwtExampleButton = document.getElementById("jwt-example-button");
  const exampleToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.signature";

  const decodeSegment = (segment) => {
    const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const decoded = atob(padded);
    return decodeURIComponent(
      decoded
        .split("")
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join("")
    );
  };

  const formatJson = (value) => JSON.stringify(value, null, 2);

  const renderEmpty = () => {
    jwtHeader.textContent = "";
    jwtPayload.textContent = "";
    jwtStatus.textContent = "Paste a token to decode the header and payload.";
    jwtStatus.classList.remove("error");
  };

  const renderError = (message) => {
    jwtHeader.textContent = "";
    jwtPayload.textContent = "";
    jwtStatus.textContent = message;
    jwtStatus.classList.add("error");
  };

  const handleDecode = () => {
    const token = jwtInput.value.trim();
    if (!token) {
      renderEmpty();
      return;
    }

    const parts = token.split(".");
    if (parts.length !== 3) {
      renderError("That does not look like a JWT. It should have three sections.");
      return;
    }

    try {
      const headerJson = JSON.parse(decodeSegment(parts[0]));
      const payloadJson = JSON.parse(decodeSegment(parts[1]));
      jwtHeader.textContent = formatJson(headerJson);
      jwtPayload.textContent = formatJson(payloadJson);
      jwtStatus.textContent = "Decoded successfully. Signature not validated.";
      jwtStatus.classList.remove("error");
    } catch (error) {
      renderError("Unable to decode this token. Check the formatting and try again.");
    }
  };

  jwtInput.addEventListener("input", handleDecode);
  jwtExampleButton.addEventListener("click", () => {
    jwtInput.value = exampleToken;
    handleDecode();
  });
  renderEmpty();
</script>
