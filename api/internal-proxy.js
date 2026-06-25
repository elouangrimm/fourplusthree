// /api/proxy.js
export default async function handler(req, res) {
  // Get everything after /api/proxy in the incoming URL request
  const { path, ...queryParams } = req.query;

  if (!path) {
    return res.status(400).json({ error: "Missing path parameter" });
  }

  // Reconstruct the destination URL on Hank's server
  const targetUrl = new URL(`https://hankgreen.com/fourbythree/${path}`);

  // Forward any incoming query parameters (like ?w=5941331 or ?ts=...)
  Object.keys(queryParams).forEach((key) => {
    targetUrl.searchParams.append(key, queryParams[key]);
  });

  try {
    const response = await fetch(targetUrl.toString(), {
      method: req.method,
      headers: {
        // Pass essential headers, avoiding host mismatches
        "Content-Type": req.headers["content-type"] || "application/json",
      },
    });

    // Handle images vs json/text files properly
    const contentType = response.headers.get("content-type") || "";
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", contentType);

    if (contentType.includes("image")) {
      const buffer = await response.arrayBuffer();
      return res.status(response.status).send(Buffer.from(buffer));
    } else {
      const text = await response.text();
      return res.status(response.status).send(text);
    }
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Proxy fetch failed", details: error.message });
  }
}
