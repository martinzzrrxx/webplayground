function escapeScript(value) {
  return value.replace(/<\/script/gi, "<\\/script");
}

export function buildPreviewDocument({ html, css, javascript }) {
  const safeCss = css ?? "";
  const safeJavascript = escapeScript(javascript ?? "");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      :root {
        color-scheme: light;
        font-family: "Segoe UI", sans-serif;
      }

      body {
        margin: 0;
        padding: 16px;
        background: #ffffff;
        color: #0f172a;
      }

      ${safeCss}
    </style>
    <script>
      const toPlainText = (value) => {
        if (value instanceof Error) {
          return value.stack || value.message;
        }

        if (typeof value === "string") {
          return value;
        }

        try {
          return JSON.stringify(value);
        } catch {
          return String(value);
        }
      };

      const send = (type, payload) => {
        parent.postMessage({ channel: "playground", type, payload }, "*");
      };

      ["log", "info", "warn", "error"].forEach((level) => {
        const original = console[level].bind(console);
        console[level] = (...args) => {
          send("console", {
            level,
            messages: args.map(toPlainText)
          });
          original(...args);
        };
      });

      window.addEventListener("error", (event) => {
        send("error", {
          message: event.message,
          source: event.filename,
          line: event.lineno,
          column: event.colno
        });
      });

      window.addEventListener("unhandledrejection", (event) => {
        send("error", {
          message: "Unhandled promise rejection: " + toPlainText(event.reason)
        });
      });
    </script>
  </head>
  <body>
    ${html ?? ""}
    <script>
      try {
        ${safeJavascript}
      } catch (error) {
        parent.postMessage(
          {
            channel: "playground",
            type: "error",
            payload: { message: error.stack || error.message || String(error) }
          },
          "*"
        );
      }
    <\/script>
  </body>
</html>`;
}
