import { useState } from "react";

export default function App() {
  const [url, setUrl] = useState("");
  const [report, setReport] = useState(null);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleCrawl = () => {
    setLoading(true);
    setReport(null);
    setProgress([]);

    const eventSource = new EventSource(
      `http://localhost:5000/crawl-stream?url=${encodeURIComponent(url)}`
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // Live updates
      if (!data.done) {
        setProgress((prev) => [...prev, data]);
      } else {
        // Final results
        setReport(data);
        setLoading(false);
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      setLoading(false);
      eventSource.close();
      alert("Crawl failed or connection lost.");
    };
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>🌍 Website Crawler with Live Progress</h1>

      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Enter site URL (e.g. https://www.corporategear.com)"
        style={{ width: "100%", padding: "0.5rem", marginBottom: "1rem" }}
      />
      <button
        onClick={handleCrawl}
        disabled={loading}
        style={{
          background: "royalblue",
          color: "white",
          border: "none",
          borderRadius: "4px",
          padding: "0.5rem 1rem",
        }}
      >
        {loading ? "Crawling..." : "Start Crawl"}
      </button>

      {/* Live progress section */}
      {loading && (
        <div style={{ marginTop: "1rem" }}>
          <h3>Progress ({progress.length} pages crawled)</h3>
          <ul>
            {progress.slice(-5).map((p, i) => (
              <li key={i}>
                ✅ {p.url} — Status: {p.status}, Broken Images: {p.brokenImages}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Final report */}
      {report && (
        <div style={{ marginTop: "2rem" }}>
          <h2>📊 Summary</h2>
          <p>Total Pages: {report.summary.totalPages}</p>
          <p>Pages Returning 404: {report.summary.pages404}</p>
          <p>Pages With Broken Images: {report.summary.pagesWithBrokenImages}</p>

          <h3>Details</h3>
          <table border="1" cellPadding="6" width="100%">
            <thead>
              <tr>
                <th>URL</th>
                <th>Status</th>
                <th>Broken Images</th>
              </tr>
            </thead>
            <tbody>
              {report.details.map((row, i) => (
                <tr key={i}>
                  <td>{row.url}</td>
                  <td>{row.status}</td>
                  <td>{row.brokenImages}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
