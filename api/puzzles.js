export default async function handler(req, res) {
  try {
    const response = await fetch(
      "https://hankgreen.com/fourbythree/puzzles.json",
    );
    const data = await response.json();

    // Forward the data back to your frontend with friendly CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch remote puzzles" });
  }
}
